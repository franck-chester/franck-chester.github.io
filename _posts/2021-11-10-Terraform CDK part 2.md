---
title: Terraform CDK - part 2
date: 2021-11-10
tags: iac terraform cdktf
image: assets/images/2021-11-11-day04-tfgraph.svg
---

It's been 2 week since the [previous post in this series]({% post_url 2021-10-30-Terraform CDK part 1 %}) and I am really starting to enjoy the Terraform CDK.

Now that I am more comfortable with it, and with Typescript, I have started organising my code in much more (imo) expressive blocks, which I will later be able to move to a reusable nodejs module, should I wish to.

That said, this exercise is a painful (but useful) reminder of the chasm between the simplistic tutorials available on the web, and reality.
If you, as I do, insist on not using the AWS console, and adhere to best practices such as least privilege and strict separation of infrastructure and code, there are quite a few hoops and loops needed to be jumped through. 

Anyway, where were we? Translating this tutorial - [Using Lambda with API Gateway](https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway-tutorial.html) - into Terraform CDK Typescript code.

## Create the function

### Separations of infrastructure and code concerns
I want to make sure I keep the code separate from the infrastructure, both in separate code repositories.
I should deploy the infrastructure first, then the actual code that powers my lambda function.

I still need to research whether this is actually best practice, but my gut feeling is that using terraform to deploy the code for each new release is the wrong way to go.
My plan is therefore to deploy the lambda infrastructure with a *skeleton* implementation, and once that is in place, use the [`update-function-code`](https://awscli.amazonaws.com/v2/documentation/api/2.0.33/reference/lambda/update-function-code.html) CLI command to deploy each new version of the actual implementation.

Also, my first attempt at terraforming the lambda function for this tutorial was based on using the [archive provider](https://registry.terraform.io/providers/hashicorp/archive/latest/docs) to zip the source code before using the zip file as a parameter of the [lambda function resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function), very much like [this tutorial](http://aws-cloud.guru/creating-aws-lambdas-through-terraform-using-archive_file/) and every other tutorial out there, including the API Gateway one I am trying to reproduce.

Now, this was already a bad idea in standard terraform, as it intermingles infrastructure and code deployments, and seems somehow worse in the CDK, probably because it is hard to stop myself from using the CDK code, which is meant to generate the HCL files which then deploy the infrastructure, to zip and deploy the code itself, which is really a separate concern. I had a few goes at this in various formats but at the end of the day, it smells.

So, I am going to create a [S3 bucket for code deployment](https://aws.amazon.com/blogs/compute/new-deployment-options-for-aws-lambda/), as part of my sandbox setup scripts, refer to it within my CDK code and later, when calling [`update-function-code`](https://awscli.amazonaws.com/v2/documentation/api/2.0.33/reference/lambda/update-function-code.html).

### Use iamlive to create IaC user IAM policy

I know from experience that creating a S3 bucket requires access rights to quite a few [Actions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/list_amazons3.html#amazons3-actions-as-permissions). Rather than carry on with the painful one-at-a-time approach used in [part 1]({% post_url 2021-10-30-Terraform CDK part 1 %}), I am going to get smarter and use the [iamlive utility](https://github.com/iann0036/iamlive).

I first clone the repository, build and install the utility.
I then add this new powershell script - `iamlive.ps1` - to my setup folder:

``` powershell
param([switch]$stop)

if($stop.isPresent){
    write-host "Stopping iamlive..."
    Stop-Process -Name "iamlive"
    $env:AWS_CSM_ENABLED=$false
    write-host "Stopping iamlive: done"
}
else{
    $env:AWS_CSM_ENABLED=$true
    $env:AWS_CSM_PORT=31000
    $env:AWS_CSM_HOST=127.0.0.1

    write-host "Starting iamlive..."
    Start-Process -FilePath "$env:GOPATH/bin/iamlive.exe"
}
```

This will start iamlive in a separate terminal, and proxy all AWS SDK calls (as used by terraform) through the iamlive utility, which will [map them to the corresponding permissions](https://raw.githubusercontent.com/iann0036/iamlive/main/iamlivecore/map.json).

I also modify my `main.ts` file to source the AWS profile from a `awsprofile` environmental variable. I would have preferred a command line parameter, but these are currently not easy to pass down to the app in all [`cdktf` commands](https://discuss.hashicorp.com/t/run-command-cdktf-deploy-with-parameters/14374/2).

``` typescript
constructor(scope: Construct, id: string, profile: string) {
    super(scope, id)

    new AwsProvider(this, 'aws', {
      region: 'eu-west-1',
      profile: profile
    })

...

const profile = ('awsprofile' in process.env) ? `${process.env.awsprofile}` : 'franck-iac';
console.log(`Using AWS profile ${profile}`)

const app = new App()

new MyStack(app, "day04", profile);
app.synth();
```

I then execute `cdktf apply` with my admin profile, and get a nice policy in the terminal running `iamlive`:

``` json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeAccountAttributes",
                "s3:ListBucket",
                "iam:GetPolicy",
                "iam:GetRole",
                "iam:GetPolicyVersion",
                "iam:ListRolePolicies",
                "iam:ListAttachedRolePolicies",
                "s3:GetBucketAcl",
                "s3:GetBucketCORS",
                "s3:GetBucketWebsite",
                "s3:GetBucketVersioning",
                "s3:GetAccelerateConfiguration",
                "s3:GetBucketRequestPayment",
                "s3:GetBucketLogging",
                "s3:GetLifecycleConfiguration",
                "s3:GetReplicationConfiguration",
                "s3:GetEncryptionConfiguration",
                "s3:GetBucketObjectLockConfiguration",
                "s3:GetBucketTagging",
                "s3:DeleteBucket",
                "s3:CreateBucket",
                "s3:PutBucketTagging",
                "s3:PutBucketVersioning",
                "iam:ListPolicyVersions",
                "iam:ListInstanceProfilesForRole",
                "iam:DeletePolicy",
                "iam:DeleteRole"
            ],
            "Resource": "*"
        }
    ]
}
```

I follow this with `cdktf destroy`, again with my admin profile, which updates the policy displayed in the terminal with the additional actions required to delete the infrastructure.

I can now incorporate the missing actions in the IaC user policy. 

I've also installed the [sort json array vscode extension](https://github.com/fvclaus/vsc-sort-json-array#sort-json-array), to keep my `iac-policy.json` file tidy, and easily compare the output from iamlive to it, and identify what needs adding.

Although this works remarkably well, it is far from perfect and can still miss some actions, probably because the iamlive [map](https://raw.githubusercontent.com/iann0036/iamlive/main/iamlivecore/map.json) is incomplete or out of date. For example, it output the v1 permissions for the APIGateway, and completely missed the `s3:DeleteObject` and `s3:DeleteObjectVersion`, causing me quite a bit of faffing to identify the correct policy using the tried and tested combination of IAM console and documentation [(Actions, resources, and condition keys for AWS services)](https://docs.aws.amazon.com/service-authorization/latest/reference/reference_policies_actions-resources-contextkeys.html). The policy also needs the actions associated with updates, otherwise small updates to the CDK code will fail without destroying the stack entirely first before reapplying it.

Finally, I will need to revisit this again later as this is still not a [least privilege](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#grant-least-privilege) policy, as it still enables my IaC user to delete resources it hasn't created.
My next move, in a future experiment, will be [using tags](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_iam-tags.html).

### Creating a S3 bucket for lambda code deployment

Not much to say, we simply use the [S3 Bucket resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket), making sure to set 
`forceDestroy: true` to ensure [all objects (including any locked objects) are from the bucket before destroying it](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket#force_destroy) [^1] - otherwise we wouldn't be able to tear down this infrastructure.

``` typescript
import { S3 } from '@cdktf/provider-aws';

...

const sourceBucket = new S3.S3Bucket(this, 'lambda_source_bucket', {
    bucket: 'franck-iac-lambda-source-bucket',
    acl: 'private',
    tags: tags,
    versioning: {
      enabled: false
    },
    forceDestroy: true
  });
```

### Upload placeholder lambda source code to S3 Bucket

We cannot create a lambda function without code behind it, but we can point the lambda to a barebone implementation which we'll later override with the actual code [^2].

``` javascript
exports.handler = function(event, context, callback) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    const responseBody = {
        "warning":"Placeholder code - function not yet implemented",
        "event":event
    }
    var response = {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": JSON.stringify(responseBody),
        "isBase64Encoded": false
    };
    callback(null, response);
};
```

We do this with a combination of Terraform assets and S3 Bucket object, as [per this example](https://www.terraform.io/docs/cdktf/concepts/assets.html#usage-example).

``` typescript
const sourceAsset = new TerraformAsset(this, "lambda_asset", {
    path: path.resolve(__dirname, "src"),
    type: AssetType.ARCHIVE, 
});

const sourceBucketObject = new S3.S3BucketObject(this, "lambda_archive", {
    bucket: sourceBucket.bucket!,   // exclamation mark is non-null-assertion-operator
    key: sourceAsset.fileName,
    source: sourceAsset.path,
});
```

NB: when using one resource's attribute to set another's, we often hit this error `Type 'string | undefined' is not assignable to type 'string'`.
To work around this, we simply use the typescript [non-null assertion operator (!)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html#non-null-assertion-operator).

### Creating a Lambda function sourced from a S3 Bucket

First import the [`LambdaFunction`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function) type from the AWS provider.
Here we are hitting the [recently introduced namespaces](https://github.com/hashicorp/terraform-cdk/blob/main/docs/upgrade-guide/upgrading-to-0.7.md#aws-provider-has-namespaced-resources). For IAM and S3, these looked fine, but for lambda functions, we would end up referring to `LambdaFunction.LambdaFunction` in our code, which would be pants. We therefore [alias the type](https://www.typescriptlang.org/docs/handbook/namespaces.html#aliases)

``` typescript
import { LambdaFunction as LambdaFunctionNS } from '@cdktf/provider-aws';
const { LambdaFunction } = LambdaFunctionNS.LambdaFunction;

...

const lambda = new LambdaFunction(this, 'lambda', {
    functionName: 'LambdaFunctionOverHttps',
    description: 'as per https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway-tutorial.html',
    s3Bucket: sourceBucket.bucket!,
    s3Key: sourceBucketObject.key,
    role: LambdaApiGatewayRole.arn,
    runtime: 'nodejs12.x',
    handler: 'index.handler',
    tags: tags
});
```

We point the lambda at the S3 bucket and object created earlier, from where it will load our skeleton implementation.

### Deploy to the sandbox

``` terraform
Deploying Stack: day04
Resources
 ✔ AWS_IAM_POLICY       lambda_apigateway_p aws_iam_policy.lambda_apigateway_policy
                        olicy
 ✔ AWS_IAM_ROLE         lambda-apigateway-r aws_iam_role.lambda_apigateway_role
                        ole                       
 ✔ AWS_LAMBDA_FUNCTION  lambda              aws_lambda_function.lambda
 ✔ AWS_S3_BUCKET        lambda_source_bucke aws_s3_bucket.lambda_source_bucket
                        t
 ✔ AWS_S3_BUCKET_OBJECT lambda_archive      aws_s3_bucket_object.lambda_archive

Summary: 5 created, 0 updated, 0 destroyed.
```

Success.

## Test the lambda

The tutorial and a lot of examples out there are out of date, [CLI v2 defaults to base 64 input](https://docs.aws.amazon.com/cli/latest/userguide/cliv2-migration.html#cliv2-migration-binaryparam). 

You can either add a --cli-binary-format raw-in-base64-out argument to the command:

```
aws lambda invoke --profile admin-sandbox --function-name LambdaFunctionOverHttps --payload file://tests/helloworld.json --cli-binary-format raw-in-base64-out tests/output.txt 
```

OR specify the file with `fileb://`:

```
 aws lambda invoke --profile admin-sandbox --function-name LambdaFunctionOverHttps --payload fileb://tests/helloworld.json  tests/output.txt
```

Either way, with `tests/helloworld.json` set to:

``` json
{
    "Hello": "world"
}
```
Both call result in a success response : 

``` json
{
    "StatusCode": 200,
    "ExecutedVersion": "$LATEST"
}
```

with `tests/output.txt`:

``` json
{
    "statusCode": 200,
    "headers": {
        "Content-Type": "application/json"
    },
    "body": "{\"warning\":\"Placeholder code - function not yet implemented\",\"event\":{\"Hello\":\"world\"}}",
    "isBase64Encoded": false
}
```

which matches what we expect - success.

## Create a REST API using API Gateway

We need to mix and match and translate these 3 terraform HCL examples into their CDK equivalent
- [api_gateway_deployment](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_deployment#terraform-resources)
- [api_gateway_integration](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_integration#lambda-integration) 
- [api_gateway_account](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_account#example-usage)

This will:
- create a REST API
- define a resource that can be manipulated via it
- define an integration to our lambda function to handle operations against that resource
- deploy and configure that REST API as 'stage' v1
- configure our API Gateway account so that it can log to cloudwatch

Worth noting as well that one thing I forgot to do in my [previous post]({% post_url 2021-10-30-Terraform CDK part 1 %}) was to attach the policy to the role.
Most examples use inline policies, but I prefer to [use managed ones](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html#choosing-managed-or-inline) for consistency.

Finally, we use a [terraform output](https://www.terraform.io/docs/language/values/outputs.html) to display the deployed API URL on the console

``` typescript
const restApi = new APIGateway.ApiGatewayRestApi(this, 'api_gateway', {
    name: 'DynamoDBOperations',
    description: 'as per https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway-tutorial.html',
    tags: tags,
    endpointConfiguration: {
        types: ['REGIONAL']
    }
});

const apiGatewayResource = new APIGateway.ApiGatewayResource(this, 'api_gateway_resource', {
    parentId: restApi.rootResourceId,
    pathPart: "dynamodbmanager",
    restApiId: restApi.id
});

const apiGatewayMethod = new APIGateway.ApiGatewayMethod(this, 'api_gateway_method_post', {
    authorization: "NONE",
    httpMethod: "POST",
    resourceId: apiGatewayResource.id,
    restApiId: restApi.id
});

const apiGatewayMethodIntegration = new APIGateway.ApiGatewayIntegration(this, 'api_gateway_integration', {
    type: 'AWS_PROXY',
    httpMethod: apiGatewayMethod.httpMethod, // the method to use when calling the API Gateway endpoint
    integrationHttpMethod: 'POST',              //  the method used by API Gateway to call the backend (it should always be POST for Lambda)
    resourceId: apiGatewayResource.id,
    restApiId: restApi.id,
    uri: lambda.invokeArn,
    credentials: credentials.arn
});

const apiGatewayDeployment= new APIGateway.ApiGatewayDeployment(this, 'api_gateway_deployment', {
    restApiId: restApi.id,
    triggers: {
        redeployment: Fn.sha1(Fn.jsonencode([apiGatewayResource.id, apiGatewayMethod.id, apiGatewayMethodIntegration.id]))
    },
    lifecycle: {
        createBeforeDestroy: true
    }
});

const apiGatewayDeploymentStage = new APIGateway.ApiGatewayStage(stack, 'api_gateway_stage', {
    deploymentId: apiGatewayDeployment.id,
    restApiId: apiGatewayDeployment.restApiId,
    stageName: 'v1',
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

new IAM.IamRolePolicyAttachment(stack, 'apigateway_role_policy_attachment', {
    role: apiGatewayRole.name!,
    policyArn: apiGatewayPolicy.arn
});

return new APIGateway.ApiGatewayAccount(stack, 'api_gateway_account', {
    cloudwatchRoleArn: apiGatewayRole.arn
});

new TerraformOutput(this, "invoke-url", {
    description: 'Invoke URL for the API',
    value: apiGatewayDeploymentStage.invokeUrl
});

```

## Deploy to the sandbox

``` terraform
Deploying Stack: day04
Resources
 ✔ AWS_API_GATEWAY_ACCO api_gateway_account aws_api_gateway_account.api_gateway_acc
   UNT                                      ount
 ✔ AWS_API_GATEWAY_DEPL api_gateway_deploym aws_api_gateway_deployment.api_gateway_
   OYMENT               ent                 deployment
 ✔ AWS_API_GATEWAY_INTE api_gateway_method_ aws_api_gateway_integration.api_gateway
   GRATION              post_integration_dy _method_post_integration_dynamodbmanage
                        namodbmanager       r
 ✔ AWS_API_GATEWAY_METH api_gateway_method_ aws_api_gateway_method.api_gateway_meth
   OD                   post_dynamodbmanage od_post_dynamodbmanager
                        r
 ✔ AWS_API_GATEWAY_METH api-gateway-method- aws_api_gateway_method_settings.api-gat
   OD_SETTINGS          settings            eway-method-settings
 ✔ AWS_API_GATEWAY_RESO api_gateway_resourc aws_api_gateway_resource.api_gateway_re
   URCE                 e_dynamodbmanager   source_dynamodbmanager
 ✔ AWS_API_GATEWAY_REST api_gateway_rest_ap aws_api_gateway_rest_api.api_gateway_re
   _API                 i_dynamodbmanager   st_api_dynamodbmanager
 ✔ AWS_API_GATEWAY_STAG api_gateway_stage   aws_api_gateway_stage.api_gateway_stage
   E
 ✔ AWS_IAM_POLICY       api_gateway_policy  aws_iam_policy.api_gateway_policy
 ✔ AWS_IAM_POLICY       lambda_apigateway_p aws_iam_policy.lambda_apigateway_policy
                        olicy
 ✔ AWS_IAM_POLICY       rest_api_policy_TfT aws_iam_policy.rest_api_policy_TfTokenT
                        okenTOKEN9          OKEN9
 ✔ AWS_IAM_ROLE         apigateway_role     aws_iam_role.apigateway_role
 ✔ AWS_IAM_ROLE         lambda_apigateway_r aws_iam_role.lambda_apigateway_role
                        ole
 ✔ AWS_IAM_ROLE         rest_api_role_TfTok aws_iam_role.rest_api_role_TfTokenTOKEN
                        enTOKEN11           11
 ✔ AWS_IAM_ROLE_POLICY_ apigateway_role_pol aws_iam_role_policy_attachment.apigatew
   ATTACHMENT           icy_attachment      ay_role_policy_attachment
 ✔ AWS_IAM_ROLE_POLICY_ lambda_apigateway_r aws_iam_role_policy_attachment.lambda_a
   ATTACHMENT           ole_policy_attachme pigateway_role_policy_attachment
                        nt
 ✔ AWS_IAM_ROLE_POLICY_ rest_api_role_polic aws_iam_role_policy_attachment.rest_api
   ATTACHMENT           y_attachment_TfToke _role_policy_attachment_TfTokenTOKEN12
                        nTOKEN12
 ✔ AWS_LAMBDA_FUNCTION  lambda              aws_lambda_function.lambda
 ✔ AWS_S3_BUCKET        lambda_source_bucke aws_s3_bucket.lambda_source_bucket
                        t
 ✔ AWS_S3_BUCKET_OBJECT lambda_archive      aws_s3_bucket_object.lambda_archive

Summary: 20 created, 0 updated, 0 destroyed.

Output: invoke-url = https://ruwqixs5g5.execute-api.eu-west-1.amazonaws.com/v1
```

Looking good! 20 terraform resources though, for a simple API!

## Invoke our newly deployed API

I am a big fan of the vscode [REST client extension](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) - much easier than the bloat of [postman](https://www.postman.com/product/what-is-postman/)

```
POST https://ruwqixs5g5.execute-api.eu-west-1.amazonaws.com/v1/dynamodbmanager
Content-Type: application/json

{
     "hello": "world"
}
```
results in 
```
HTTP/1.1 200 OK
Date: Wed, 10 Nov 2021 22:02:33 GMT
Content-Type: application/json
Content-Length: 1738
Connection: close
x-amzn-RequestId: 9de3e048-306f-4ada-8e8b-cd7dd2d71d2e
x-amz-apigw-id: Im8rAFZIjoEFuOw=
X-Amzn-Trace-Id: Root=1-618c4179-18f4fd98090a20d23b2638d3;Sampled=0

{
  "warning": "Placeholder code - function not yet implemented",
  "event": {
    "resource": "/dynamodbmanager",
    "path": "/dynamodbmanager",
    "httpMethod": "POST",
    "headers": {
      "accept-encoding": "gzip, deflate",
      "content-type": "application/json",
      "Host": "ruwqixs5g5.execute-api.eu-west-1.amazonaws.com",
      "User-Agent": "vscode-restclient",
      "X-Amzn-Trace-Id": "Root=1-618c4179-18f4fd98090a20d23b2638d3",
      "X-Forwarded-For": "98.76.54.32",
      "X-Forwarded-Port": "443",
      "X-Forwarded-Proto": "https"
    },
    "multiValueHeaders": {
      "accept-encoding": [
        "gzip, deflate"
      ],
      "content-type": [
        "application/json"
      ],
      "Host": [
        "ruwqixs5g5.execute-api.eu-west-1.amazonaws.com"
      ],
      "User-Agent": [
        "vscode-restclient"
      ],
      "X-Amzn-Trace-Id": [
        "Root=1-618c4179-18f4fd98090a20d23b2638d3"
      ],
      "X-Forwarded-For": [
        "82.68.27.66"
      ],
      "X-Forwarded-Port": [
        "443"
      ],
      "X-Forwarded-Proto": [
        "https"
      ]
    },
    "queryStringParameters": null,
    "multiValueQueryStringParameters": null,
    "pathParameters": null,
    "stageVariables": null,
    "requestContext": {
      "resourceId": "hagmic",
      "resourcePath": "/dynamodbmanager",
      "httpMethod": "POST",
      "extendedRequestId": "Im8rAFZIjoEFuOw=",
      "requestTime": "10/Nov/2021:22:02:33 +0000",
      "path": "/v1/dynamodbmanager",
      "accountId": "012345678910",
      "protocol": "HTTP/1.1",
      "stage": "v1",
      "domainPrefix": "ruwqixs5g5",
      "requestTimeEpoch": 1636581753401,
      "requestId": "9de3e048-306f-4ada-8e8b-cd7dd2d71d2e",
      "identity": {
        "cognitoIdentityPoolId": null,
        "accountId": null,
        "cognitoIdentityId": null,
        "caller": null,
        "sourceIp": "12.34.56.78",
        "principalOrgId": null,
        "accessKey": null,
        "cognitoAuthenticationType": null,
        "cognitoAuthenticationProvider": null,
        "userArn": null,
        "userAgent": "vscode-restclient",
        "user": null
      },
      "domainName": "ruwqixs5g5.execute-api.eu-west-1.amazonaws.com",
      "apiId": "ruwqixs5g5"
    },
    "body": "{\r\n     \"hello\": \"world\"\r\n}",
    "isBase64Encoded": false
  }
}

```

Again, result!

## Refactor the code

So far, we have not really leveraged the move from HCL to a strongly typed language (typescript).

Let's do that now - group related resources in their own functions, and start using self-descriptive names for functions and variables to make it all easier to understand.

And, while we are at it, mostly for the fun of it, because strictly speaking we have no need for it yet, let's add some logic to enable us to define multiple methods on an resource, not just POST, but GET, PUT and DELETE as well, to cover all aspects of [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete)

For example:

```typescript
function defineRestApiResourceDeployment(
    stack: TerraformStack, 
    resourceName: string, 
    lambdas: { 
        create?: LambdaFunction, 
        read?: LambdaFunction, 
        update?: LambdaFunction, 
        delete?: LambdaFunction 
    }, 
    credentials: IAM.IamRole) {

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
}
```

If we do this for all resources, our stack definition becomes much more legible (imo):

```typescript
class ApiGatewayTutorialStack extends TerraformStack {
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
}
```

Eventually, these functions could be moved to a [typescript module](https://www.typescriptlang.org/docs/handbook/modules.html) and reused across stacks.

The world is my oyster.

You can see the final code [here](https://github.com/franck-chester/franck-chester.github.io/blob/main/assets/files/2021-11-11-main.ts) 
and compare it to the [generated HCL](https://github.com/franck-chester/franck-chester.github.io/blob/main/assets/files/2021-11-11-cdk.tf.json).
My IaC user policy is [here](https://github.com/franck-chester/franck-chester.github.io/blob/main/assets/files/2021-11-11-iac-policy.json).

## Terraform graph
I would really like a pretty picture to accompany this blog, so I am going to try terraform built in [graph function](https://www.terraform.io/docs/cli/commands/graph.html).

I start by installing graphviz with chocolatey `choco install graphviz`

I can then navigate to the generated terraform files folder `\day04\cdktf.out\stacks\day04` 
and execute `> terraform graph | dot -Tsvg > ../../../../docs/day04.svg`

which gives me this `day04.svg` file:

![](/assets/images/2021-11-11-day04-tfgraph.svg)

Which is useful but quite ugly :frowning_face:

## Conclusion

I can see the benefits of using the terraform CDK to generate my Infrastructure as Code files. Using a strongly typed language allows for a much more legibility and flexibility than HCL

Next on my list are tags:
1) use them [to tighten my IAM policies](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_iam-tags.html)
2) check whether the terraform CDK allow, like the AWS one, tagging at [construct level](https://docs.aws.amazon.com/cdk/latest/guide/tagging.html)

and of course actually deploying the code for my lambda, and complete the tutorial by creating a dynamoDB table to manipulate via my API.

----------- 
[^1]: see also this blog [Benchmarking S3 force_destroy](https://dev.to/ericksoen/teaching-terraform-from-the-ground-up-benchmarking-s3-forcedestroy-2nlf)
[^2]: Interestingly, unless I am horribly mistaken, the exemplar lambda in the [API Gateway tutorial](https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway-tutorial.html) does not return the [correct schema to be used with the API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-output-format)!