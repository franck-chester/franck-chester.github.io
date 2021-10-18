---
title: Configuring Git to use the proper SSH key across multiple remote repositories
tags: git ssh
---

The new job uses both GitLab and BitBucket, and mandates SSH to access both.

Turns out this requires additional steps that weren't documented.

After setting up SSH for bitbucket, my SSH connection was fine:

```
PS C:\_workspaces> ssh-add -l
3072 SHA256:XBzl9AbCdEfGhIjKlMnOPCm3VfP9Z9M9/iB8dG7dw24 acme\franck@HALL-9001 (RSA)

PS C:\_workspaces> ssh -T git@bitbucket.org
authenticated via ssh key.

You can use git to connect to Bitbucket. Shell access is disabled
```

But I was actually unable to clone a repo:

```
PS C:\_workspaces> git clone git@bitbucket.org:acme/emar-superduperapp_ios.git
Cloning into 'emar-superduperapp_ios'...
git@bitbucket.org: Permission denied (publickey).
fatal: Could not read from remote repository.

Please make sure you have the correct access rights
and the repository exists.

```

First of all, what to do when git misbehave? Turn on tracing:

See this SO, [How can I debug git/git-shell related problems?](https://stackoverflow.com/questions/6178401/how-can-i-debug-git-git-shell-related-problems) and the [official doc](https://git-scm.com/book/en/v2/Git-Internals-Environment-Variables#Debugging)

Here, the option that helped was to turn SSH tracing on:

``` powershell
$Env:GIT_SSH_COMMAND="ssh -v"
```

I can now compare what happens when I SSH directly:
``` ssh
PS C:\_workspaces> ssh -vT git@bitbucket.org
OpenSSH_for_Windows_8.1p1, LibreSSL 3.0.2
debug1: Connecting to bitbucket.org [104.192.141.1] port 22.
debug1: Connection established.
debug1: identity file C:\\Users\\franck/.ssh/id_rsa type 0
debug1: identity file C:\\Users\\franck/.ssh/id_rsa-cert type -1
debug1: identity file C:\\Users\\franck/.ssh/id_dsa type -1
debug1: identity file C:\\Users\\franck/.ssh/id_dsa-cert type -1
debug1: identity file C:\\Users\\franck/.ssh/id_ecdsa type -1
debug1: identity file C:\\Users\\franck/.ssh/id_ecdsa-cert type -1
debug1: identity file C:\\Users\\franck/.ssh/id_ed25519 type -1
debug1: identity file C:\\Users\\franck/.ssh/id_ed25519-cert type -1
debug1: identity file C:\\Users\\franck/.ssh/id_xmss type -1
debug1: identity file C:\\Users\\franck/.ssh/id_xmss-cert type -1
debug1: Local version string SSH-2.0-OpenSSH_for_Windows_8.1
debug1: Remote protocol version 2.0, remote software version conker_df6142773d 0c1acfdf8d93
debug1: no match: conker_df6142773d 0c1acfdf8d93
debug1: Authenticating to bitbucket.org:22 as 'git'
debug1: SSH2_MSG_KEXINIT sent
debug1: SSH2_MSG_KEXINIT received
debug1: kex: algorithm: curve25519-sha256@libssh.org
debug1: kex: host key algorithm: ssh-rsa
debug1: kex: server->client cipher: chacha20-poly1305@openssh.com MAC: <implicit> compression: none
debug1: kex: client->server cipher: chacha20-poly1305@openssh.com MAC: <implicit> compression: none
debug1: expecting SSH2_MSG_KEX_ECDH_REPLY
debug1: Server host key: ssh-rsa SHA256:zzZyXwVuTsRqPoNmLkkJYKwbHaxvSc0ojez9YXaGp1A
debug1: Host 'bitbucket.org' is known and matches the RSA host key.
debug1: Found key in C:\\Users\\franck/.ssh/known_hosts:4
debug1: rekey out after 134217728 blocks
debug1: SSH2_MSG_NEWKEYS sent
debug1: expecting SSH2_MSG_NEWKEYS
debug1: SSH2_MSG_NEWKEYS received
debug1: rekey in after 134217728 blocks
debug1: Will attempt key: acme\\franck@HALL-9001 RSA SHA256:XBzl9AbCdEfGhIjKlMnOPCm3VfP9Z9M9/iB8dG7dw24 agent
debug1: Will attempt key: C:\\Users\\franck/.ssh/id_rsa RSA SHA256:WvJsAbCdEfGhIjKlMnOP0YBFy1XWm2/P6jCL7cBmQU4
debug1: Will attempt key: C:\\Users\\franck/.ssh/id_dsa
debug1: Will attempt key: C:\\Users\\franck/.ssh/id_ecdsa
debug1: Will attempt key: C:\\Users\\franck/.ssh/id_ed25519
debug1: Will attempt key: C:\\Users\\franck/.ssh/id_xmss
debug1: SSH2_MSG_SERVICE_ACCEPT received
debug1: Authentications that can continue: publickey
debug1: Next authentication method: publickey
debug1: Offering public key: acme\\franck@HALL-9001 RSA SHA256:XBzl9AbCdEfGhIjKlMnOPCm3VfP9Z9M9/iB8dG7dw24 agent
debug1: Server accepts key: acme\\franck@HALL-9001 RSA SHA256:XBzl9AbCdEfGhIjKlMnOPCm3VfP9Z9M9/iB8dG7dw24 agent
debug1: Authentication succeeded (publickey).
Authenticated to bitbucket.org ([104.192.141.1]:22).
debug1: channel 0: new [client-session]
debug1: Entering interactive session.
debug1: pledge: network
debug1: client_input_channel_req: channel 0 rtype exit-status reply 0
authenticated via ssh key.

You can use git to connect to Bitbucket. Shell access is disabled
debug1: channel 0: free: client-session, nchannels 1
Transferred: sent 3008, received 1912 bytes, in 0.2 seconds
.0
```

To what happens when I connect via git:

``` ssh
PS C:\_workspaces> $Env:GIT_SSH_COMMAND="ssh -v"
PS C:\_workspaces> git clone git@bitbucket.org:acme/emar-superduperapp_ios.git
11:00:04.773743 exec-cmd.c:237          trace: resolved executable dir: C:/Program Files/Git/mingw64/bin
11:00:04.776745 git.c:455               trace: built-in: git clone git@bitbucket.org:acme/emar-superduperapp_ios.git
Cloning into 'emar-superduperapp_ios'...
11:00:04.940743 run-command.c:666       trace: run_command: unset GIT_DIR; GIT_PROTOCOL=version=2 'ssh -v' -o SendEnv=GIT_PROTOCOL git@bitbucket.org 'git-upload-pack '\''acme/emar-superduperapp_ios.git'\'''
OpenSSH_8.7p1, OpenSSL 1.1.1k  25 Mar 2021
debug1: Reading configuration data /etc/ssh/ssh_config
debug1: Connecting to bitbucket.org [104.192.141.1] port 22.
debug1: Connection established.
debug1: identity file /c/Users/franck/.ssh/id_rsa type 0
debug1: identity file /c/Users/franck/.ssh/id_rsa-cert type -1
debug1: identity file /c/Users/franck/.ssh/id_dsa type -1
debug1: identity file /c/Users/franck/.ssh/id_dsa-cert type -1
debug1: identity file /c/Users/franck/.ssh/id_ecdsa type -1
debug1: identity file /c/Users/franck/.ssh/id_ecdsa-cert type -1
debug1: identity file /c/Users/franck/.ssh/id_ecdsa_sk type -1
debug1: identity file /c/Users/franck/.ssh/id_ecdsa_sk-cert type -1
debug1: identity file /c/Users/franck/.ssh/id_ed25519 type -1
debug1: identity file /c/Users/franck/.ssh/id_ed25519-cert type -1
debug1: identity file /c/Users/franck/.ssh/id_ed25519_sk type -1
debug1: identity file /c/Users/franck/.ssh/id_ed25519_sk-cert type -1
debug1: identity file /c/Users/franck/.ssh/id_xmss type -1
debug1: identity file /c/Users/franck/.ssh/id_xmss-cert type -1
debug1: Local version string SSH-2.0-OpenSSH_8.7
debug1: Remote protocol version 2.0, remote software version conker_df6142773d 396556d9f365
debug1: compat_banner: no match: conker_df6142773d 396556d9f365
debug1: Authenticating to bitbucket.org:22 as 'git'
debug1: load_hostkeys: fopen /c/Users/franck/.ssh/known_hosts2: No such file or directory
debug1: load_hostkeys: fopen /etc/ssh/ssh_known_hosts: No such file or directory
debug1: load_hostkeys: fopen /etc/ssh/ssh_known_hosts2: No such file or directory
debug1: SSH2_MSG_KEXINIT sent
debug1: SSH2_MSG_KEXINIT received
debug1: kex: algorithm: curve25519-sha256@libssh.org
debug1: kex: host key algorithm: ssh-rsa
debug1: kex: server->client cipher: chacha20-poly1305@openssh.com MAC: <implicit> compression: none
debug1: kex: client->server cipher: chacha20-poly1305@openssh.com MAC: <implicit> compression: none
debug1: expecting SSH2_MSG_KEX_ECDH_REPLY
debug1: SSH2_MSG_KEX_ECDH_REPLY received
debug1: Server host key: ssh-rsa SHA256:zzZyXwVuTsRqPoNmLkkJYKwbHaxvSc0ojez9YXaGp1A
debug1: load_hostkeys: fopen /c/Users/franck/.ssh/known_hosts2: No such file or directory
debug1: load_hostkeys: fopen /etc/ssh/ssh_known_hosts: No such file or directory
debug1: load_hostkeys: fopen /etc/ssh/ssh_known_hosts2: No such file or directory
debug1: Host 'bitbucket.org' is known and matches the RSA host key.
debug1: Found key in /c/Users/franck/.ssh/known_hosts:4
debug1: rekey out after 134217728 blocks
debug1: SSH2_MSG_NEWKEYS sent
debug1: expecting SSH2_MSG_NEWKEYS
debug1: SSH2_MSG_NEWKEYS received
debug1: rekey in after 134217728 blocks
debug1: Will attempt key: /c/Users/franck/.ssh/id_rsa RSA SHA256:WvJsAbCdEfGhIjKlMnOP0YBFy1XWm2/P6jCL7cBmQU4
debug1: Will attempt key: /c/Users/franck/.ssh/id_dsa
debug1: Will attempt key: /c/Users/franck/.ssh/id_ecdsa
debug1: Will attempt key: /c/Users/franck/.ssh/id_ecdsa_sk
debug1: Will attempt key: /c/Users/franck/.ssh/id_ed25519
debug1: Will attempt key: /c/Users/franck/.ssh/id_ed25519_sk
debug1: Will attempt key: /c/Users/franck/.ssh/id_xmss
debug1: SSH2_MSG_SERVICE_ACCEPT received
debug1: Authentications that can continue: publickey
debug1: Next authentication method: publickey
debug1: Offering public key: /c/Users/franck/.ssh/id_rsa RSA SHA256:WvJsAbCdEfGhIjKlMnOP0YBFy1XWm2/P6jCL7cBmQU4
debug1: Authentications that can continue: publickey
debug1: Trying private key: /c/Users/franck/.ssh/id_dsa
debug1: Trying private key: /c/Users/franck/.ssh/id_ecdsa
debug1: Trying private key: /c/Users/franck/.ssh/id_ecdsa_sk
debug1: Trying private key: /c/Users/franck/.ssh/id_ed25519
debug1: Trying private key: /c/Users/franck/.ssh/id_ed25519_sk
debug1: Trying private key: /c/Users/franck/.ssh/id_xmss
debug1: No more authentication methods to try.
git@bitbucket.org: Permission denied (publickey).
fatal: Could not read from remote repository.
```

```
debug1: Offering public key: /c/Users/franck/.ssh/id_rsa RSA SHA256:WvJsAbCdEfGhIjKlMnOP0YBFy1XWm2/P6jCL7cBmQU4
```
It is now obvious git is using the wrong key `SHA256:WvJsAbCdEfGhIjKlMnOP0YBFy1XWm2/P6jCL7cBmQU4` instead of `SHA256:XBzl9AbCdEfGhIjKlMnOPCm3VfP9Z9M9/iB8dG7dw24`. You can actually see the key is sourced from the default file `.ssh/id_rsa` (which is what I defaulted to when setting up SSH for github) instead of the correct `.ssh/bitbucket_id_rsa` I used when setting up SSH with bitbucket.

How do I fix this? 
I follow these instructions: [Using Multiple SSH Keys for Multiple GitHub Accounts](https://www.section.io/engineering-education/using-multiple-ssh-keys-for-multiple-github-accounts/), which tell me to [setup the SSH config file](https://linuxize.com/post/using-the-ssh-config-file/)

```
# GitLab
Host gitlab.intranet.com
   HostName gitlab.intranet.com
   User git
   IdentityFile ~/.ssh/id_rsa
   
# BitBucket
Host bitbucket.org
   HostName bitbucket.org, 123.456.789.1
   User git
   IdentityFile ~/.ssh/bitbucket_id_rsa
```

The `Host` bit must match the name you access your repo under, i.e. the bit after the `@`. Took me a while to figure that out until I found this post : [How to configure multiple Git accounts in your computer](https://blog.bitsrc.io/how-to-use-multiple-git-accounts-378ead121235) which made it a bit clearer.

Twist to the tale: turns out all this had already been very clearly documented by my colleagues, and I had actually RTFM myself, but somehow felt the need to reinvent the wheel anyway.

Still, now I now more about investigating git issues...