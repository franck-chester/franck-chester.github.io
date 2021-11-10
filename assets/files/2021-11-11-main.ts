import { Construct } from 'constructs';

import { App, Fn, TerraformStack, TerraformOutput } from 'cdktf';
import { TerraformAsset, AssetType } from "cdktf";

import { AwsProvider } from '@cdktf/provider-aws';
import { IAM } from '@cdktf/provider-aws';
import { S3 } from '@cdktf/provider-aws';
import { LambdaFunction as LambdaFunctionNS } from '@cdktf/provider-aws';
import LambdaFunction = LambdaFunctionNS.LambdaFunction;

import { APIGateway } from '@cdktf/provider-aws';

import * as path from "path";

const tags = {
  sandbox: 'franck-iac'
}

/**
   * Define and return a role that grants a REST API the correct IAM permissions
   * to execute a specific lambda function
   */
function defineRestApiCredentials(stack: TerraformStack, restApiIntegratedLambda: LambdaFunction): IAM.IamRole {
  const policyName = `rest_api_policy_${restApiIntegratedLambda.functionName}`;
  const policy = new IAM.IamPolicy(stack, policyName, {
    name: policyName,
    description: 'Access rights for my API Gateway lambda, as per https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway-tutorial.html#services-apigateway-tutorial-role',
    policy: JSON.stringify({
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": "lambda:InvokeFunction",
          "Resource": restApiIntegratedLambda.arn
        }
      ]
    })
  });

  const roleName = `rest_api_role_${restApiIntegratedLambda.functionName}`;
  const role = new IAM.IamRole(stack, roleName, {
    name: roleName,
    description: 'Credentials used when calling via the API Gateway',
    assumeRolePolicy: JSON.stringify({
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "Service": "apigateway.amazonaws.com"
          },
          "Action": "sts:AssumeRole"
        }
      ]
    })
  });

  new IAM.IamRolePolicyAttachment(stack, `rest_api_role_policy_attachment_${restApiIntegratedLambda.functionName}`, {
    role: role.name!,
    policyArn: policy.arn
  });

  return role;
} // defineRestApiCredentials()

/**
 * Define an API Gateway account specific to our solution.
 * This encapsulate the gateway's IAM policies.
 */
function defineApiGatewayAccount(stack: TerraformStack): APIGateway.ApiGatewayAccount {
  const apiGatewayPolicy = new IAM.IamPolicy(stack, 'api_gateway_policy', {
    name: 'api_gateway_policy',
    description: 'Access rights for my API Gateway - mainly read and write cloudwatch logs',
    policy: JSON.stringify({
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:DescribeLogGroups",
            "logs:DescribeLogStreams",
            "logs:PutLogEvents",
            "logs:GetLogEvents",
            "logs:FilterLogEvents"
          ],
          "Resource": "*"
        }
      ]
    }),
    tags: tags
  });

  const apiGatewayRole = new IAM.IamRole(stack, 'apigateway_role', {
    name: 'apigateway_role',
    description: 'IAM role for the API Gateway',
    assumeRolePolicy: JSON.stringify({
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "Service": "apigateway.amazonaws.com"
          },
          "Action": "sts:AssumeRole"
        }
      ]
    })
  });

  // Attach our policy to the role, which is usually better practice than inline policies
  new IAM.IamRolePolicyAttachment(stack, 'apigateway_role_policy_attachment', {
    role: apiGatewayRole.name!,
    policyArn: apiGatewayPolicy.arn
  });

  return new APIGateway.ApiGatewayAccount(stack, 'api_gateway_account', {
    cloudwatchRoleArn: apiGatewayRole.arn
  });
}//defineApiGatewayAccount()

/**
 * Define the lambda function that will handle POST to our resource via the API Gateway
 */
function defineLambdaFunctionForPostMethod(stack: TerraformStack, sourceBucket: S3.S3Bucket, sourceBucketObjectForLambdaSkeleton: S3.S3BucketObject, lambdaApiGatewayRole: IAM.IamRole): LambdaFunction {
  return new LambdaFunction(stack, 'lambda', {
    functionName: 'LambdaFunctionOverHttps',
    description: 'as per https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway-tutorial.html',
    s3Bucket: sourceBucket.bucket!,
    s3Key: sourceBucketObjectForLambdaSkeleton.key,
    role: lambdaApiGatewayRole.arn,
    runtime: 'nodejs12.x',
    handler: 'index.handler',
    tags: tags
  });
} // defineLambdaFunctionForPostMethod()

/**
 * Define the S3 bucket that will be used to load the lambda source code from
 */
function defineSourceS3Bucket(stack: TerraformStack, bucketName: string): S3.S3Bucket {
  return new S3.S3Bucket(stack, 'lambda_source_bucket', {
    bucket: bucketName,
    acl: 'private',
    tags: tags,
    versioning: {
      enabled: false
    },
    forceDestroy: true
  });
}// defineSourceS3Bucket()

/**
 * Define a named reference to a deployment, which is a snapshot of the API.
 */
function defineApigatewayDeploymentStage(stack: TerraformStack, stageName: string, apiGatewayDeployment: APIGateway.ApiGatewayDeployment) {
  const apiGatewayDeploymentStage = new APIGateway.ApiGatewayStage(stack, 'api_gateway_stage', {
    deploymentId: apiGatewayDeployment.id,
    restApiId: apiGatewayDeployment.restApiId,
    stageName: stageName,
    tags: tags
  });
  new APIGateway.ApiGatewayMethodSettings(stack, 'api-gateway-method-settings', {
    restApiId: apiGatewayDeployment.restApiId,
    stageName: apiGatewayDeploymentStage.stageName,
    methodPath: "*/*",
    settings: {
      metricsEnabled: true,
      dataTraceEnabled: true,
      loggingLevel: 'INFO',
      throttlingRateLimit: 100,
      throttlingBurstLimit: 50
    }
  });
  return apiGatewayDeploymentStage;
} // createApigatewayDeploymentStage()

/**
 * Associate a named REST API resource with 1 or more lambda functions
 * each handling one of the CRUD operation on that resource
 */
function defineRestApiResourceDeployment(stack: TerraformStack, resourceName: string, lambdas: { create?: LambdaFunction, read?: LambdaFunction, update?: LambdaFunction, delete?: LambdaFunction }, credentials: IAM.IamRole) {
  const restApi = new APIGateway.ApiGatewayRestApi(stack, `api_gateway_rest_api_${resourceName}`, {
    name: resourceName,
    description: 'as per https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway-tutorial.html',
    tags: tags,
    endpointConfiguration: {
      types: ['REGIONAL']
    }
  });

  const apiGatewayResource = new APIGateway.ApiGatewayResource(stack, `api_gateway_resource_${resourceName}`, {
    parentId: restApi.rootResourceId,
    pathPart: resourceName,
    restApiId: restApi.id
  });

  const redeploymentTriggerElements = [apiGatewayResource.id];
  const defineMethodForResource = (method: string, lambda: LambdaFunction) => {
    const apiGatewayMethod = new APIGateway.ApiGatewayMethod(stack, `api_gateway_method_${method.toLowerCase()}_${resourceName}`, {
      authorization: "NONE",
      httpMethod: method.toUpperCase(),
      resourceId: apiGatewayResource.id,
      restApiId: restApi.id,
    });

    const apiGatewayMethodIntegration = new APIGateway.ApiGatewayIntegration(stack, `api_gateway_method_post_integration_${resourceName}`, {
      type: 'AWS_PROXY',
      httpMethod: apiGatewayMethod.httpMethod,
      integrationHttpMethod: 'POST',
      resourceId: apiGatewayResource.id,
      restApiId: restApi.id,
      uri: lambda.invokeArn,
      credentials: credentials.arn
    });

    redeploymentTriggerElements.push(apiGatewayMethod.id, apiGatewayMethodIntegration.id);
  } // defineRestApiResourceDeployment()

  if (lambdas.create) {
    defineMethodForResource("POST", lambdas.create);
  }
  if (lambdas.read) {
    defineMethodForResource("GET", lambdas.create!);
  }
  if (lambdas.update) {
    defineMethodForResource("PUT", lambdas.create!);
  }
  if (lambdas.delete) {
    defineMethodForResource("DELETE", lambdas.create!);
  }

  const deployment = new APIGateway.ApiGatewayDeployment(stack, 'api_gateway_deployment', {
    restApiId: restApi.id,
    triggers: {
      redeployment: Fn.sha1(Fn.jsonencode(redeploymentTriggerElements))
    },
    lifecycle: {
      createBeforeDestroy: true
    }
  });

  return deployment;
}// defineRestApiResourceDeployment()

/**
 * Define a S3 object that contains the skeleton code for the lambda functions
 * All functions start from the same skeleton code
 * Deployment of the actual code is a separate concern, which happen after the 
 * infrastructure has been deployed.
 */
function defineSourceBucketObjectForLambdaSkeleton(stack: TerraformStack, sourceBucket: S3.S3Bucket): S3.S3BucketObject {
  const sourceAsset = new TerraformAsset(stack, "lambda_asset", {
    path: path.resolve(__dirname, "src"),
    type: AssetType.ARCHIVE, // if left empty it infers directory and file
  });

  const sourceBucketObject = new S3.S3BucketObject(stack, "lambda_archive", {
    bucket: sourceBucket.bucket!,
    key: sourceAsset.fileName,
    source: sourceAsset.path,
  });
  return sourceBucketObject;
}// defineSourceBucketObjectForLambdaSkeleton()

function defineApiGatewayRole(stack: TerraformStack): IAM.IamRole {
  const lambdaApiGatewayPolicy = new IAM.IamPolicy(stack, 'lambda_apigateway_policy', {
    name: 'lambda_apigateway_policy',
    description: 'Access rights for my API Gateway lambda, as per https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway-tutorial.html#services-apigateway-tutorial-role',
    policy: JSON.stringify({
      "Version": "2012-10-17",
      "Statement": [
        {
          "Resource": "*",
          "Action": [
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:PutLogEvents"
          ],
          "Effect": "Allow"
        }
      ]
    })
  });

  const lambdaApiGatewayRole = new IAM.IamRole(stack, 'lambda_apigateway_role', {
    name: 'lambda_apigateway_role',
    assumeRolePolicy: JSON.stringify({
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "Service": "lambda.amazonaws.com"
          },
          "Action": "sts:AssumeRole"
        }
      ]
    })
  });

  new IAM.IamRolePolicyAttachment(stack, 'lambda_apigateway_role_policy_attachment', {
    role: lambdaApiGatewayRole.name!,
    policyArn: lambdaApiGatewayPolicy.arn
  });
  return lambdaApiGatewayRole;
}// function defineApiGatewayRole()

/**
 *  
 */
class ApiGatewayTutorialStack extends TerraformStack {
  /**
   * Our stack constructor is where we define all resources
   */
  constructor(scope: Construct, id: string, profile: string) {
    super(scope, id)

    new AwsProvider(this, 'aws', {
      region: 'eu-west-1',
      profile: profile
    })

    defineApiGatewayAccount(this);

    const lambdaApiGatewayRole = defineApiGatewayRole(this);
    const sourceBucket = defineSourceS3Bucket(this, 'franck-iac-lambda-source-bucket');
    const sourceBucketObjectForLambdaSkeleton = defineSourceBucketObjectForLambdaSkeleton(this, sourceBucket);
    const lambdaFunctionForPostMethod = defineLambdaFunctionForPostMethod(this, sourceBucket, sourceBucketObjectForLambdaSkeleton, lambdaApiGatewayRole);

    const restApiCredentials = defineRestApiCredentials(this, lambdaFunctionForPostMethod);
    const restApiDeployment = defineRestApiResourceDeployment(this, 'dynamodbmanager', { create: lambdaFunctionForPostMethod }, restApiCredentials);
    const apiGatewayDeploymentStage = defineApigatewayDeploymentStage(this, 'v1', restApiDeployment);

    // output the API URL
    new TerraformOutput(this, "invoke-url", {
      description: 'Invoke URL for the API',
      value: apiGatewayDeploymentStage.invokeUrl
    });
  }
}//class ApiGatewayTutorialStack


const profile = ('awsprofile' in process.env) ? `${process.env.awsprofile}` : 'franck-iac';
console.log(`Using AWS profile ${profile}`)
const app = new App()

new ApiGatewayTutorialStack(app, "day04", profile);
app.synth();
