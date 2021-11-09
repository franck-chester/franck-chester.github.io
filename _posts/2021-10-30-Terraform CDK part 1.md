---
title: Terraform CDK - part 1
date: 2021-10-30
tags: iac terraform cdktf
image: /assets/images/2021-10-30-code.png
---

In this post I start building infrastructure components in my AWS sandbox, using [the recently released Terraform Cloud Development Kit (CDK)](https://aws.amazon.com/blogs/developer/introducing-the-cloud-development-kit-for-terraform-preview/).
I am going to keep it very basic, simply create an IAM role and policy, just to get myself going. What I am going to do however is dig into each little command and instructions I found in various tutorials, to make sure I understand the magic they hide from me.

This builds up from my previous post: [Scripting access to my AWS sandbox]({% post_url 2021-10-01-Scripting access to my AWS sandbox %}).
Again, do note that I run a windows machine and use the powershell terminal.

# Terraform 

Terraform itself is a very popular, very much de-facto standard, open standard '[Infrastructure as Code](https://www.martinfowler.com/bliki/InfrastructureAsCode.html)' (IaC) tool, created by [Hashicorp](https://www.hashicorp.com/) for provisioning cloud infrastructures. 

It uses configuration files, written in [Hashicorp Configuration Language](https://github.com/hashicorp/hcl) to describe what we want our infrastructure to look like.
When executed, Terraform will compare the actual infrastructure with that desired end state, and programmatically create or destroy resources to match.
Where resources have dependencies on each other, it is smart enough to create (and later destroy) them in the right order.

These files can be source controlled and code reviewed, and the execution of terraform entirely automated, thus ensuring consistency and reproducibility between deployments, even across multiple environments, eliminating human error and greatly reducing the time it takes to setup infrastructure.

Terraform uses the concept of [providers](https://www.terraform.io/docs/language/providers/index.html), , that implement a standard interface over the target infrastructure components API and can then be configured via HCL.

I got quite adept at terraforming in my previous role, including creating my own [custom provider in Go](https://www.hashicorp.com/blog/writing-custom-terraform-providers) to workaround a then shortcoming in the [Datadog official provider](https://registry.terraform.io/providers/DataDog/datadog/latest/docs).

HCL is great but quickly becomes a pain to work with when your target infrastructure is dynamic. As soon as you need to loop or assert, you find yourself hacking and/or writing hard to read and maintain HCL. It is also, a very ugly language to work with.

# Terraform CDK

[Announced in summer 2020](https://aws.amazon.com/blogs/developer/introducing-the-cloud-development-kit-for-terraform-preview/), Terraform Cloud Development Kit is a [programmatic layer used to generate HCL configurations](https://www.terraform.io/docs/cdktf/index.html).

This brings a host of advantages.
1. You get to pick and leverage your development language of choice.
2. You can use said language to create abstraction over your infrastructure, so that instead of referring the an 'EC2 instance' your code can refer to 'NGNIX server'
3. You have (or at least eventually will get) more say over your IaC workflow, generate your HCL configuration from programmatic triggers, maybe pull data from external APIs to decide what to build or destroy, etc.

It also brings a lot of pain, mainly because it [adds a few more layers](https://www.terraform.io/docs/cdktf/concepts/cdktf-architecture.html) between your and the actual HCL files that act as the source of truth for your infrastructure. Throughout the course of writing this post, I had to fight issues with [typescript](https://www.typescriptlang.org/), [node.js](https://nodejs.org/en/about/), the terraform CDK, the [terraform CDK command line interface (CLI)](https://www.terraform.io/docs/cdktf/cli-reference/cli-configuration.html) and the [generated HCL itself](https://www.terraform.io/docs/language/syntax/configuration.html). Great learning exercise, but could be a pain in production.

To be fair, most of this pain is down to 1) my being new to typescript and node.js, and 2) the Terraform CDK still being in development, and [admittedly not ready for production](https://www.terraform.io/docs/cdktf/index.html#project-maturity-and-production-readiness).

In fact, as I spread my exploration over a few hours every friday evening, I was (un)lucky enough to hit a few releases and breaking changes. I have now learned to check the [changelog](https://github.com/hashicorp/terraform-cdk/blob/main/CHANGELOG.md) before starting each experiment.

# Installing the Terraform CDK

Download **nodejs** installer from [https://nodejs.org/en/](https://nodejs.org/en/) or use chocolatey

```
> choco install nodejs-lts
```

Download the **yarn package manager** from [https://classic.yarnpkg.com](https://classic.yarnpkg.com/en/docs/install#windows-stable), or use chocolatey

```
> choco install yarn
```

Install the **CDK for Terraform** globally:

```
> npm install -g cdktf-cli
```

Finally[^1], install typescript itself, globallu:

```
npm install -g typescript
```

[^1]: This step is undocumented elsewhere, and maybe not actually required.
    However, what was meant to be a quick experiment with the CDK ended up spread over 5 attempts: Things went very wrong, I kept hitting `MODULE_NOT_FOUND` errors when running `cdktf synth`. The code and all paths were fine, I and [vscode](https://code.visualstudio.com/docs) could see all the modules, but `cdktf synth` kept failing.
    On what was actually Day 07, I decided to ignored the `cdktf` commands and compile the typescript code directly (`tsc --build --clean`, `tsc --build --verbose`), which required me to install typescript (`npm install -g typescript`), which then somehow got rid of my `MODULE_NOT_FOUND` errors.
    I am therefore going to assume that installing typescript separately is a pre-requisite to using the terraform CDK. 
    I won't know for sure until retry it all on a clean machine, maybe spin a container for it.

## CDK Terraform project initialisation

We create a new empty folder (`day03`) and run the [`cdktf init` command](https://www.terraform.io/docs/cdktf/cli-reference/commands.html#init) to initialise a brand new project:

```
day03> cdktf init --template=typescript --local
```

```
Newer version of Terraform CDK is available [0.6.3] - Upgrade recommended
Note: By supplying '--local' option you have chosen local storage mode for storing the state of your stack.
This means that your Terraform state file will be stored locally on disk in a file 'terraform.<STACK NAME>.tfstate' in the root of your project.
? projectName: day03
? projectDescription: Day 3 of my playing with the sandbox: let's terraform something...
npm notice created a lockfile as package-lock.json. You should commit this file.
+ constructs@10.0.0
+ cdktf@0.6.2
added 51 packages from 26 contributors and audited 51 packages in 29.859s       

5 packages are looking for funding
  run `npm fund` for details      

found 0 vulnerabilities

npm WARN optional SKIPPING OPTIONAL DEPENDENCY: fsevents@^2.3.2 (node_modules\jest-haste-map\node_modules\fsevents):
npm WARN notsup SKIPPING OPTIONAL DEPENDENCY: Unsupported platform for fsevents@2.3.2: wanted {"os":"darwin","arch":"any"} (current: {"os":"win32","arch":"x64"})
+ ts-jest@27.0.5
+ jest@27.2.4
+ @types/jest@27.0.2
+ @types/node@16.10.2
+ typescript@4.4.3
added 332 packages from 296 contributors and audited 385 packages in 97.719s

29 packages are looking for funding
  run `npm fund` for details       

found 0 vulnerabilities

========================================================================================================    

  Your cdktf typescript project is ready!

  cat help                Print this message

  Compile:
    npm run get           Import/update Terraform providers and modules (you should check-in this directory)
    npm run compile       Compile typescript code to javascript (or "npm run watch")
    npm run watch         Watch for changes and compile typescript in the background
    npm run build         Compile typescript

  Synthesize:
    cdktf synth [stack]   Synthesize Terraform resources from stacks to cdktf.out/ (ready for 'terraform apply')

  Diff:
    cdktf diff [stack]    Perform a diff (terraform plan) for the given stack

  Deploy:
    cdktf deploy [stack]  Deploy the given stack

  Destroy:
    cdktf destroy [stack] Destroy the stack

  Test:
    npm run test        Runs unit tests (edit __tests__/main-test.ts to add your own tests)
    npm run test:watch  Watches the tests and reruns them on change

  Upgrades:
    npm run upgrade        Upgrade cdktf modules to latest version
    npm run upgrade:next   Upgrade cdktf modules to latest "@next" version (last commit)

 Use Prebuilt Providers:

  You can add one or multiple of the prebuilt providers listed below:

  npm install @cdktf/provider-aws
  npm install @cdktf/provider-google
  npm install @cdktf/provider-azurerm
  npm install @cdktf/provider-docker
  npm install @cdktf/provider-github
  npm install @cdktf/provider-null

  You can also build any module or provider locally. Learn more https://cdk.tf/modules-and-providers

========================================================================================================
```

Turns out I'm already out of date[^2] so need to [upgrade to v0.6.03](https://github.com/hashicorp/terraform-cdk/blob/main/docs/upgrade-guide/upgrading-to-0.6.md) with `npm run upgrade`, which execute the [run-script command](https://docs.npmjs.com/cli/v7/commands/npm-run-script) the upgrade script defined in the `package.json` file : `npm i cdktf@latest cdktf-cli@latest` . 

[^2]: A few weeks elapsed between my installing the tooling and actually trying to use it

```
day03> npm run upgrade

> day03@1.0.0 upgrade C:\_workspaces\tvg-sandbox\day03
> npm i cdktf@latest cdktf-cli@latest


> core-js-pure@3.18.1 postinstall C:\_workspaces\tvg-sandbox\day03\node_modules\core-js-pure
> node -e "try{require('./postinstall')}catch(e){}"

> @apollo/protobufjs@1.2.2 postinstall C:\_workspaces\tvg-sandbox\day03\node_modules\@apollo\protobufjs
> node scripts/postinstall

npm WARN optional SKIPPING OPTIONAL DEPENDENCY: fsevents@2.3.2 (node_modules\fsevents):
npm WARN notsup SKIPPING OPTIONAL DEPENDENCY: Unsupported platform for fsevents@2.3.2: wanted {"os":"darwin","arch":"any"} (current: {"os":"win32","arch":"x64"})
+ cdktf-cli@0.6.3
+ cdktf@0.6.3
added 418 packages from 308 contributors, updated 50 packages and audited 803 packages in 235.981s

97 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

As I am targetting my AWS sandbox, I need to install the [AWS pre-built provider](https://github.com/hashicorp/cdktf-provider-aws):

```
day03>  npm install @cdktf/provider-aws

npm WARN optional SKIPPING OPTIONAL DEPENDENCY: fsevents@2.3.2 (node_modules\fsevents):
npm WARN notsup SKIPPING OPTIONAL DEPENDENCY: Unsupported platform for fsevents@2.3.2: wanted {"os":"darwin","arch":"any"} (current: {"os":"win32","arch":"x64"})
+ @cdktf/provider-aws@2.0.11
added 1 package from 1 contributor and audited 805 packages in 45.086s

97 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

Now, I got very confused at that point, and I am going to blame the docs and various examples for it.

`@cdktf/provider-aws` is a '[pre-built provider](https://www.terraform.io/docs/cdktf/concepts/providers-and-resources.html#install-pre-built-providers)' - that is, already in node.js format, installed in the standard `node_modules` folder, and imported from `@cdktf/`, e.g. `import { AwsProvider} from '@cdktf/provider-aws';`

Other types of providers, such as the [Archive provider](https://registry.terraform.io/providers/hashicorp/archive/latest/docs) need to be generated locally first:

1. add the provider to the `cdktf.json file` - for example 
    ```
    "terraformProviders": [
    "hashicorp/archive@~>2.2.0"
    ]
    ```
2. run [`cdktf get`](https://www.terraform.io/docs/cdktf/cli-reference/commands.html#get). This will
   - pull the provider from the terraform registry, 
   - generate the typescript constructs for that provider, that is the code that when executed will synthesise the proper terraform constructs for that provider. 
    
These constructs get generated in the `.gen` folder and are imported from `./.gen/providers/`, e.g. `import { ArchiveProvider, DataArchiveFile } from "./.gen/providers/archive"`. A lot, if not most of the examples out there still use a local AWS provider, rather than the prebuilt one. 
This initially caused me to both install the pre-built modules, then build a local copy as well, and ignore the pre-built one.

## Create an execution role

My aim is eventually to port the infrastructure elements of the [API gateway tutorial](https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway-tutorial.html) to the Terraform CDK. The first step is to create an [execution role](https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html). 

*This AWS Identity and Access Management (IAM) role uses a custom policy to give your Lambda function permission to access the required AWS resources. Note that you must first create the policy and then create the execution role.*

## Code the execution role
I edit the generated `main.ts` file to import the AWS provider and IAM resources from the pre-built provider in stalled earlier:

``` typescript
import { AwsProvider} from '@cdktf/provider-aws';
import { IAM } from '@cdktf/provider-aws';
```

I can now control click on the type and find the constructor definition:

``` typescript
/**
* Create a new {@link https://www.terraform.io/docs/providers/aws/r/iam_policy.html aws_iam_policy} Resource.
*
* @param scope The scope in which to define this construct.
* @param id The scoped construct ID.
* @stability stable
*/
constructor(scope: Construct, id: string, config: IamPolicyConfig);
```

which I use to guess the following code:

`main.ts`:

``` typescript
import { Construct } from 'constructs';
import { App, TerraformStack} from 'cdktf';
import { AwsProvider} from '@cdktf/provider-aws';

import { IAM } from '@cdktf/provider-aws';

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id)

    new AwsProvider(this, 'aws', {
      region: 'eu-west-1',
      profile: "franck-iac"
    })

    const policy = {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "",
          "Resource": "*",
          "Action": [
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:PutLogEvents"
          ],
          "Effect": "Allow"
        }
      ]
    };

    new IAM.IamPolicy(this, 'lambda_apigateway_policy', {
      name:'lambda_apigateway_policy',
      description: 'Access rights for my API Gateway lambda, as per https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway-tutorial.html#services-apigateway-tutorial-role',
      policy:JSON.stringify(policy)
    });
  }
}

const app = new App()
new MyStack(app, "day03");
app.synth();

```

### Generate the HCL for the execution role

I can execute the above `main.ts` file with the [(`cdktf synth`)](https://www.terraform.io/docs/cdktf/cli-reference/commands.html#synth) command to [generate (aka synthesise)](https://www.terraform.io/docs/cdktf/concepts/cdktf-architecture.html#terraform) the equivalent terraform configuration files:

`cdktf.out\stacks\day03\cdk.tf.json`:

``` json
{
  "//": {
    "metadata": {
      "version": "0.7.0",
      "stackName": "day03",
      "backend": "local"
    }
  },
  "terraform": {
    "required_providers": {
      "aws": {
        "version": "~> 3.0",
        "source": "aws"
      }
    }
  },
  "provider": {
    "aws": [
      {
        "profile": "franck-iac",
        "region": "eu-west-1"
      }
    ]
  },
  "resource": {
    "aws_iam_policy": {
      "lambda_apigateway_policy": {
        "description": "Access rights for my API Gateway lambda, as per https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway-tutorial.html#services-apigateway-tutorial-role",
        "name": "lambda_apigateway_policy",
        "policy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"\",\"Resource\":\"*\",\"Action\":[\"logs:CreateLogGroup\",\"logs:CreateLogStream\",\"logs:PutLogEvents\"],\"Effect\":\"Allow\"}]}",
        "//": {
          "metadata": {
            "path": "day03/lambda_apigateway_policy",
            "uniqueId": "lambda_apigateway_policy"
          }
        }
      }
    }
  }
}
```

### Plan and apply the generated configuration

The generated terraform configuration results in the following [terraform plan (`cdktf plan`)](https://www.terraform.io/docs/cli/commands/plan.html):

``` terraform
> cdktf plan 
Stack: day03
Resources
 + AWS_IAM_POLICY       lambda-apigateway-p aws_iam_policy.lambda-apigateway-policy

Diff: 1 to create, 0 to update, 0 to delete.
```

We are starting from a blank sandbox and therefore we should only need to create one new resource, for the policy.

Let's go wild and apply this to the sandbox

``` terraform
> cdktf apply
⠇ Deploying Stack: day03
Resources
 ⠼ AWS_IAM_POLICY       lambda-apigateway-p aws_iam_policy.lambda-apigateway-policy

Summary: 0 created, 0 updated, 0 destroyed.
[2021-10-29T13:41:41.946] [ERROR] default - ╷
│ Error: error creating IAM policy lambda-apigateway-policy: AccessDenied: User: arn:aws:iam::012345678910:user/franck-iac is not authorized to perform: iam:CreatePolicy on resource: policy lambda-apigateway-policy
```

This `AccessDenied` error makes sense, the IAM policy I attached to my IaC user is a dummy one (see [first post in the series]({% post_url 2021-10-01-Scripting access to my AWS sandbox %})), I haven't actually tailored it to this project.

## Revisit our Terraform's AWS profile access rights

Now, sticking with a [least privilege](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#grant-least-privilege) approach with AWS can be a struggle.
I usually do as [this blog](https://aws.amazon.com/blogs/security/techniques-for-writing-least-privilege-iam-policies/) suggests and use the console.

Here, given the error message `iam:CreatePolicy`, let's navigate to the IAM service, and look under either 'write' (usually associated with access right for the creation of stuff) and 'permission management'. Bingo, it's under the latter:

![screenshot IAM console](/assets/images/2021-10-30-IAMPolicy-createPolicy.png)

Now, add a resource. The console is quite emphatic that a specific resource should be specified, and quite right too: `*` is the root of all evil.
Here, we do not have a specific resource, but we can specify will will only create policy in the current account.

Let's recreate our `iac-policy.json` file as:

``` json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "IaC01",
            "Effect": "Allow",
            "Action": "iam:CreatePolicy",
            "Resource": "arn:aws:iam::012345678910:policy/*"
        }
    ]
}
```

This gives our IaC user the right to create a new policy in our account, and our account only.
I can use [my handy `update-policy.ps1` script]({% post_url 2021-10-01-Scripting access to my AWS sandbox %})) to easily update my IaC user's right with this policy.

Let's try again:

``` terraform
> cdktf apply
...
AccessDenied: User: arn:aws:iam::012345678910:user/franck-iac is not authorized to perform: iam:GetPolicy on resource: policy arn:aws:iam::012345678910:policy/lambda-apigateway-policy
```

Getting there. For the lack of comprehensive documentation, I am going to go a few rounds like this, allowing additional IAM action in IaC user policy one by one.
The advantage is that I can check the [IAM actions](https://docs.aws.amazon.com/service-authorization/latest/reference/list_identityandaccessmanagement.html) individually to understand what is going on under the hood. The disadvantage is that the process is slow and painful.

I have yet to find a smarter way to do this, and I am not on my own - as per this [terraform issue](https://github.com/hashicorp/terraform/issues/2834), and [stackoverflow](https://stackoverflow.com/questions/51273227/whats-the-most-efficient-way-to-determine-the-minimum-aws-permissions-necessary).
I will, one day, experiment with [iamlive](https://github.com/iann0036/iamlive), which would theoretically allow me to execute my terraform configuration with a super -user, log the corresponding access rights and then add these to my IaC user policy.

Anyway, my `iac-policy.json` ends up looking like this :

``` json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "IaC01",
            "Effect": "Allow",
            "Action": [
                "iam:CreatePolicy",
                "iam:GetPolicy",
                "iam:GetPolicyVersion",
                "iam:ListPolicyVersions",
                "iam:DeletePolicy"
            ],
            "Resource": "arn:aws:iam::012345678910:policy/*"
        }
    ]
}
```

## Success

``` terraform
> cdktf apply
Deploying Stack: day03
Resources
 ✔ AWS_IAM_POLICY       lambda_apigateway_policy aws_iam_policy.lambda_apigateway_policy

Summary: 1 created, 0 updated, 0 destroyed.
```

Hurrah!: Let's peek at the IAM console... Result: we have terraformed a policy via the CDK! :smile:

![screenshot IAM console](/assets/images/2021-10-30-newly_created_policy.png)

## Create the role

Add this to `main.ts`:

``` typescript
const lambda_assume_role_policy = {
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
    };

    new IAM.IamRole(this, 'lambda-apigateway-role', {
      name: 'lambda-apigateway-role',
      assumeRolePolicy: JSON.stringify(lambda_assume_role_policy)
    });
```

``` terraform
Error: error creating IAM Role (lambda-apigateway-role): AccessDenied: User: arn:aws:iam::012345678910:user/franck-iac is not authorized to perform: iam:CreateRole on resource: arn:aws:iam::012345678910:role/lambda-apigateway-role
```

Here we go again... After a few tries and errors, these are the access rights we need to add to the IaC role.
Note that I add them to `iac-policy.json` as a separate [policy statement](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_statement.html), to try and keep track of what right is used for what.

``` json
{
    "Sid": "IaC02",
    "Effect": "Allow",
    "Action": [
        "iam:CreateRole",
        "iam:GetRole",
        "iam:ListRolePolicies",
        "iam:ListAttachedRolePolicies",
        "iam:ListInstanceProfilesForRole",
        "iam:DeleteRole"
    ],
    "Resource": "arn:aws:iam::012345678910:role/*"
}
```

``` terraform
> cdktf apply
Deploying Stack: day03
Resources
 ✔ AWS_IAM_ROLE         lambda-apigateway-role aws_iam_role.lambda-apigateway-role

Summary: 1 created, 0 updated, 0 destroyed.
```

Our code didn't change the policy, therefore it hasn't been updated or destroyed.
The role itself is new, therefore has been created as a new resource, which can can see in the IAM console:

![screenshot IAM console](/assets/images/2021-10-30-IAMPolicy-createRole.png)

## Cleanup

When experimenting in the cloud is it good practice to clean up as soon as we're done, and save ourselves money. Doesn't really matter here, roles and policies don't incur costs, but a good habit to get into.

``` terraform
> cdktf destroy
Destroying Stack: day03
Resources
 ✔ AWS_IAM_POLICY       lambda_apigateway_policy aws_iam_policy.lambda_apigateway_policy

 ✔ AWS_IAM_ROLE         lambda-apigateway-role aws_iam_role.lambda-apigateway-role

Summary: 2 destroyed.
```

``` powershell
> .\teardown.ps1
Delete Access Key for IaC user 'franck-iac' ...
Detach policy  to user 'franck-iac'...
Delete IaC user 'franck-iac' ...
Delete access policy 'franck-iac' ...
Sandbox IaC user teardown complete ...
```

## Conclusion

This is all very basic but I now have a good understanding of the Terraform CDK and its foibles. I have also tested my developer workflow, and exercised my IaC scripts.

I will continue this experiment in a later post, deploy a lambda function, configure the API Gateway to invoke it, etc.




