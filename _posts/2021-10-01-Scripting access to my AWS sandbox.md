---
title: Scripting access to my AWS sandbox
tags: aws-cli sandbox iac
---

Today I am documenting how I intend to use the AWS sandbox environments provided by my current employer. These are [phoenix environments](https://martinfowler.com/bliki/PhoenixServer.html) - we can book them for anything between 1 and 7 days, after which time they get wiped out with [AWS nuke](https://github.com/rebuy-de/aws-nuke#aws-nuke).  
We get given near free rein, with [`AdministratorAccess`](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_job-functions.html#jf_administrator)  AWS managed policy. We are also supposedly restricted in the EC2 instances size we can launch, although I have not seen this reflected in the policies attached to my user :confused: .

If you've stumbled upon these instructions from somewhere else, you might have been given an account by your employer, or more likely, as I had to do in my previous job, used your own credit card to get one and hope the [AWS free tier](https://aws.amazon.com/free/) is enough for you to play with.

NB: I use a windows machine and the powershell terminal.

## Pre-reqs

### AWS CLI

Install the AWS command line interface, v2, as per [Installing, updating, and uninstalling the AWS CLI version 2 on Windows](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-windows.html)

```
> msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
```

```
> aws --version
aws-cli/2.2.38 Python/3.8.8 Windows/10 exe/AMD64 prompt/off
```

### AWS powershell tools

This is mostly to manage my iac profile and credentials, as I prefer to use the cli directly. 
However, the [Set-AWSCredentials](https://docs.aws.amazon.com/powershell/latest/reference/index.html?page=Set-AWSCredential.html&tocid=Set-AWSCredential) cmdlet will be used in my scripts to manage my cli profile.

Follow the instructions for [Installing the AWS tools for powershell on windows](https://docs.aws.amazon.com/powershell/latest/userguide/pstools-getting-set-up-windows.html#ps-installing-awstools), limiting ourselves to the `AWS.Tools.Common` module.

```
Install-Module -Name AWS.Tools.Installer
Install-AWSToolsModule AWS.Tools.Common -CleanUp
```

## Book a sandbox

This is a process internal to my current employer. They provide us with a portal that triggers a script that initialises a dedicated AWS account with a set of admin credentials, before emailing the user (that is me) with the account details and a one-time password:

```
Hello, franck@acme.com
Please find your login details below:

Console: https://012345678910.signin.aws.amazon.com/console/
Username: franck@acme.com
Password: 7w9cu61Tl8T0EXAMPLE 
```

## Create access key for the admin user

The first order of business is to logon to the console to create an access key for my admin user.  
The idea is that once I have done this, I will not use the console to manage my sandbox, but do everything via Command Line Interface (CLI) and Infrastructure as Code (IaC) scripts.

The admin user password must be changed on first access. I use a password I manage in my [keepass password manager](https://keepass.info/).

I then navigate to the [IAM (identity and Access Management) web console]( https://console.aws.amazon.com/iam/) to [create an access key](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html#Using_CreateAccessKey).

I either keep the page up while I perform the next step, or cut and paste the key details somewhere safe.

## Create or Update my admin-sandbox profile

Configure a named profile as per [Quick configuration with `aws configure`](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html#cli-configure-quickstart-config).

Once the `admin-sandbox` profile has been created once, the existing values can be reused by simply pressing return when prompted

```
> aws configure --profile admin-sandbox
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: eu-west-2
Default output format [None]: json
```

## Initialise an IaC specific profile

Only need to do this once, I'll reuse the one profile across my sandbox experiments.

```
> aws configure --profile franck-iac
AWS Access Key ID [None]: 
AWS Secret Access Key [None]: 
Default region name [None]: eu-west-2
Default output format [None]: json
```

## create policy via CLI

I am keen on limiting my IaC user to the permissions needed for the specific experiment I am running, and nothing more.

Each experiment will define the IaC policy as [a JSON document](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies.html), for example:

``` json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeImages",
                "es:*",
                "ec2:CreateImage"
            ],
            "Resource": "*"
        }
    ]
}
``` 

NB: very bad example, at this stage I do not have a policy document I have actually used!

I can then use this file with the CLI [`create-policy`](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/iam/create-policy.html):

```
> aws iam create-policy --profile admin-sandbox --policy-name franck-iac --policy-document file://iac-policy.json --tag Key=sandbox,Value=franck-iac
{
    "Policy": {
        "PolicyName": "franck-iac",
        "PolicyId": "ANPAQSHUG5ELHLEXAMPLE",
        "Arn": "arn:aws:iam::012345678910:policy/franck-iac",
        "Path": "/",
        "DefaultVersionId": "v1",
        "AttachmentCount": 0,
        "PermissionsBoundaryUsageCount": 0,
        "IsAttachable": true,
        "CreateDate": "2021-09-30T07:00:06+00:00",
        "UpdateDate": "2021-09-30T07:00:06+00:00",
        "Tags": [
            {
                "Key": "sandbox",
                "Value": "franck-iac"
            }
        ]
    }
}
```

If and when I need to update this policy to gradually add the required access right, I will update the file and call [`create-policy-version`](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/iam/create-policy-version.html):

```
> aws iam --profile admin-sandbox create-policy-version --set-as-default --policy-arn arn:aws:iam::012345678910:policy/franck-iac --policy-document file://iac-policy.json
{
    "PolicyVersion": {
        "VersionId": "v2",
        "IsDefaultVersion": true,
        "CreateDate": "2021-10-29T13:22:09+00:00"
    }
}
```

The `--set-as-default` is important, without it our IaC user will not be attached to the new version!

NB: [A managed policy can have up to 5 versions](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-versioning.html). Before you create a new version, we must delete an existing version ([`delete-policy-version`](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/iam/delete-policy-version.html)). Here we don't really care, therefore we'll always delete the previous version. To script this, we'll use [`list-policy-versions`](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/iam/list-policy-versions.html) and delete anything with ` "IsDefaultVersion": false`.

## Create IaC user via CLI

I use [`create-user`](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/iam/create-user.html):

```
> aws iam create-user --profile admin-sandbox --user-name franck-iac --permissions-boundary arn:aws:iam::012345678910:policy/franck-iac --tag Key=sandbox,Value=franck-iac
{
    "User": {
        "Path": "/",
        "UserName": "franck-iac",
        "UserId": "AIDAQSHUG5ELIKEXAMPLE",
        "Arn": "arn:aws:iam::012345678910:user/franck-iac",
        "CreateDate": "2021-09-30T07:05:43+00:00",
        "PermissionsBoundary": {
            "PermissionsBoundaryType": "Policy",
            "PermissionsBoundaryArn": "arn:aws:iam::012345678910:policy/franck-iac"
        },
        "Tags": [
            {
                "Key": "sandbox",
                "Value": "franck-iac"
            }
        ]
    }
}
```

## Attach the policy to the user

Now, do note that the previous command set the user's permission boundaries, that is the maximum range of what it is allowed to do, which is different from its actual permissions. These are set separately, with [`attach-user-policy`](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/iam/attach-user-policy.html).

Here I am being either silly and/or paranoid, as I use the same policy document for boundaries and actual rights. This will guarantee that the policy is the one and only definition of what this user can do. 

```
aws iam attach-user-policy --profile admin-sandbox --user-name franck-iac --policy-arn arn:aws:iam::012345678910:policy/franck-iac --tag Key=sandbox,Value=franck-iac 

```

## Create access key for user

I use [`create-access-key`](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/iam/create-access-key.html):

```
aws iam create-access-key --profile admin-sandbox  --user-name franck-iac
{
    "AccessKey": {
        "UserName": "franck-iac",
        "AccessKeyId": "AKIAQSHUG5ELFEXAMPLE",
        "Status": "Active",
        "SecretAccessKey": "ZVtmI0yh0J0Z+NhfTsIVl7Ell4PelOiXGEXAMPLE",
        "CreateDate": "2021-09-30T07:07:48+00:00"
    }
}
```

## Save access keys to IaC user profile

This is where we use the [Set-AWSCredentials](https://docs.aws.amazon.com/powershell/latest/reference/index.html?page=Set-AWSCredential.html&tocid=Set-AWSCredential).

Worth noting that *on platforms that support the encrypted credential file the profile is written to the **encrypted store**. If the platform does not support the encrypted store (Linux, MacOS, Windows Nano Server) the profile is written to the plain text ini-format shared credential file at %HOME%\.aws\credentials. To force the profile to be written to the shared credential file on systems that support both stores (i.e. Windows), specify the path and filename of the credential file using the -ProfileLocation parameter.*

Our command is therefore

```
Set-AWSCredential -AccessKey AKIAQSHUG5ELFEXAMPLE -SecretKey ZVtmI0yh0J0Z+NhfTsIVl7Ell4PelOiXGEXAMPLE -StoreAs franck-iac -ProfileLocation "$($env:userprofile)\.aws\credentials" 

```

At this point I now have a IaC profile I will be able to use with Terraform.

## Tearing things down

Although the environment will eventually be nuked, I am keen to do the right thing and clean up after myself.

I will therefore generate [cli-input.json](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-skeleton.html) files which I'll save locally so that they can be used the delete the policy, access key and user we've just created

## Handle errors in my scripts

See [Understanding return codes from the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-returncodes.html#powershell)

## Putting it all together

### `variables.ps1`

``` powershell
$username = 'franck-iac'
$sandbox = 'franck-iac'
$tags = "Key=sandbox,Value=$sandbox" 

$identity = aws sts get-caller-identity --profile admin-sandbox | ConvertFrom-Json 
$account = $identity.Account
```

### `setup.ps1`

``` powershell
."$PSSCriptRoot/variables.ps1"

write-host "Create access policy for IaC users ..."
$policy = aws iam create-policy --profile admin-sandbox --policy-name $username --policy-document file://$PSScriptRoot/iac-policy.json --tag $tags

if($lastexitcode -eq 254){
    # The command returned an error, probably because the policy already exists
    ## for example if we ran this script multiple time
    # Recreate the arn from first principle (ie the account id and polic name
    $PolicyArn = "arn:aws:iam::$($account):policy/$($username)"
    write-host "Attempt to retrieve existing access policy for IaC users ..."
    $policy = aws iam get-policy --policy-arn $PolicyArn
}
if($lastexitcode){
    write-error "Aborting script, unable to create or retrieve access policy"
    exit -1
}
$ap =  $policy | ConvertFrom-Json  
$policyArn = $ap.Policy.Arn
write-host "Created access policy for IaC users, ARN = $policyArn"

write-host "Create IaC user '$username' ..."
$u = aws iam create-user --profile admin-sandbox --user-name $username --permissions-boundary $policyArn --tag $tags | ConvertFrom-Json  
write-host "Created IaC user '$username', ARN = $($u.User.Arn)"

write-host "Attach policy $policyArn to user '$username'..."
aws iam attach-user-policy --profile admin-sandbox --user-name $username --policy-arn $policyArn --tag $tags 

write-host "Create access key for IaC user '$username' ..."
$ak = aws iam create-access-key --profile admin-sandbox --user-name $username | ConvertFrom-Json  
$accesskeyId = $ak.AccessKey.AccessKeyId
write-host "Create cli-input file for eventual call to delete-access-key when we tear this down......"
@"
{
    "UserName": "$username",
    "AccessKeyId": "$accesskeyId"
}
"@ | set-content "$PSScriptRoot/cli-input-delete-access-key.json"
write-host "Created access key for IaC user '$username', ID = $accesskeyId"

write-host "Update profile for IaC user '$username' ..."
Set-AWSCredential -AccessKey $accesskeyId -SecretKey $ak.AccessKey.SecretAccesskey -StoreAs $username -ProfileLocation "$($env:userprofile)\.aws\credentials" 
write-host "Updated profile for IaC user '$username' . "

Write-host "All done - you can now terraform at will"
```

### `update-policy.ps1`

This is the script I run everytime I need to tweak my IaC user access right by editing `iac-policy.json`:

``` powershell
."$PSSCriptRoot/variables.ps1"

# Recreate the arn from first principle (ie the account id and polic name
$PolicyArn = "arn:aws:iam::$($account):policy/$($username)"

write-host "Create new default version of policy '$username' / $PolicyArn..."
$pv = aws iam create-policy-version --profile admin-sandbox --set-as-default --policy-document file://iac-policy.json --policy-arn $PolicyArn | ConvertFrom-Json  
if(-not $lastexitcode){
    write-host "Created version $($pv.PolicyVersion.VersionId) of policy '$username'"
}

write-host "Delete previous versions of policy '$username' ..."
$pl = aws iam list-policy-versions --profile admin-sandbox --policy-arn $PolicyArn | ConvertFrom-Json  
foreach ($v in $pl.Versions) {
    if (-not $v.IsDefaultVersion) {
        write-host "Delete version $($v.VersionId) of access policy '$username' ..."
        aws iam delete-policy-version  --profile admin-sandbox --policy-arn $PolicyArn --version-id $v.VersionId
    }
}
write-host "Delete previous versions of policy '$username': done"

```

### `teardown.ps1`

The teardown script is all about undoing everything `setup.ps1' did, in reverse order.
The order matters, you cannot delete a policy that is attached to a user.

``` powershell
."$PSSCriptRoot/variables.ps1"

write-host "Delete Access Key for IaC user '$username' ..."
aws iam delete-access-key  --profile admin-sandbox --cli-input-json file://$PSScriptRoot/cli-input-delete-access-key.json

write-host "Detach policy $policyArn to user '$username'..."
# Recreate the arn from first principle (ie the account id and polic name
$PolicyArn = "arn:aws:iam::$($account):policy/$($username)"
aws iam detach-user-policy --profile admin-sandbox --user-name $username --policy-arn $policyArn

write-host "Delete IaC user '$username' ..."
aws iam delete-user  --profile admin-sandbox --user-name $username 

write-host "Delete access policy '$username' ..."
aws iam delete-policy --profile admin-sandbox --policy-arn $PolicyArn

write-host "Sandbox IaC user teardown complete ..."

```

## What next?

I'll want to invoke [get-cost-and-usage](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ce/get-cost-and-usage.html) to get an idea of the overall cost of my experiment.

I'll also want to parametrise the scripts to allow me to pass the policy file name as an argument, allow me to have experiment specific policies.

That said, the next post in this series will be about me [using the Terraform CDK to setup infrastructure in the sandbox]({% post_url 2021-10-30-Terraform CDK part 1%}).

