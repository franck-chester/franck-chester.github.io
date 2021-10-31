---
title: "iamlive: Generate an IAM policy from AWS calls using client-side monitoring (CSM) or embedded proxy"
target : https://github.com/iann0036/iamlive
source : "stackoverflow"
source_url: https://stackoverflow.com/questions/51273227/whats-the-most-efficient-way-to-determine-the-minimum-aws-permissions-necessary
tags: aws iam
---

This could be a useful tool to identify which minimum set of action to allow on my IaC user to allow it to do its works while preserving [least privilege](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#grant-least-privilege).
I have yet to find a smarter way to do this than add actions one by one, and I am not on my own - as per this [terraform issue](https://github.com/hashicorp/terraform/issues/2834), and [stackoverflow](https://stackoverflow.com/questions/51273227/whats-the-most-efficient-way-to-determine-the-minimum-aws-permissions-necessary).
I will, one day, experiment with [iamlive](https://github.com/iann0036/iamlive), which would theoretically allow me to execute my terraform configuration with a super -user, log the corresponding access rights and then add these to my IaC user policy.

