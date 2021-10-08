---
title: Installing Podman on WSL2
tags: podman docker containers wsl2 ubuntu
---

As I have a new laptop to go with the new job I am setting up my usual toolset on it.

One thing I need is the ability to run containers locally, ideally grouped via [docker-compose](https://docs.docker.com/compose/) as I have a few personal projects that already use it.

Unfortunately, [Docker Desktop](https://docs.docker.com/desktop/), is no longer free to use and requires a licence for large enterprises like Very. I quick google search leads me to this [article on running docker on WSL without Docker Desktop](https://dev.to/bowmanjd/install-docker-on-windows-wsl-without-docker-desktop-34m9).

The article itself indicates that using [podman](https://podman.io/) would be a nice and maybe easier alternative, as Podman doesn’t require a daemon, whereas docker needs systemd and [WSL2 doesn't have systemd out of the box](https://github.com/systemd/systemd/issues/8036). 

Podman can now also [run docker-compose files](https://www.redhat.com/sysadmin/podman-docker-compose), therefore I am going to try that first and follow this other article by the same author : [Using podman instead of docker on Windows Subsystem for Linux (WSL 2)](https://dev.to/bowmanjd/using-podman-on-windows-subsystem-for-linux-wsl-58ji)

## Install WSL2

Using these [instructions](https://docs.microsoft.com/en-us/windows/wsl/setup/environment#set-up-your-linux-user-info).  


## Upgrade Ubuntu to 21.04
Unfortunately, the WSL2 install will only deploy the latest [LTS version](https://ubuntu.com/about/release-cycle) of the corresponding Linux distribution.  
For Ubuntu, this is [20.04 LTS](https://ubuntu.com/blog/what-is-an-ubuntu-lts-release) which was published in April (04) 2020.

However, the Podman installation package is included in the native repositories of Ubuntu since 20.10, and the latest (tho not LTS) version is [Ubuntu 21.04 (Hirsute Hippo)](https://discourse.ubuntu.com/t/hirsute-hippo-release-notes/19221).

As this is meant to be my sandbox for learning, I might as well upgrade to 21.04.

I'll use these [instructions](https://www.windowscentral.com/how-upgrade-ubuntu-2010-wsl-windows-10).
However, these hit an undocumented snag, once again caused by the absence of `systemd` in WSL.  
The explanation and the fix for this is [documented here](https://github.com/microsoft/WSL/issues/6942#issuecomment-842629885).

## Install Podman

I follow the [official instructions](https://podman.io/getting-started/installation.html#linux-distributions), which, now that I am running on 21.04, consist of:

``` bash
sudo apt-get -y update
sudo apt-get -y install podman
```

NB: on Ubuntu, we need to add docker.io as a default search registry in order to pull containers by their short name (see [Shortnames are broken in 3.0.0 due to missing list of unqualified-search registries ](https://github.com/containers/podman/issues/9390#issuecomment-876994582)), by adding this line to `/etc/containers/registries.conf`:

```
unqualified-search-registries=["docker.io"]
```

## Alias vs-code

Thanks to Visual Studio Code (vscode) [Remote - WSL](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl) extension, I can launch my favourite IDE from WSL2 command line: `code .`.

Actually I can't because I run [Visual Studio Code (vscode) Insider Build](https://code.visualstudio.com/blogs/2016/05/23/evolution-of-insiders) coz I'm a software architect, code mostly for fun and can therefore live with a potentially unstable environment.
The executable for this is an unyieldy `code-insider`.

No problem, I just need to alias the command, which I barely remembered how to do :grin: : edit  `~/.bashrc` and add a line that reads `alias code='code-insiders'`.

## Install Git

WSL basically installs its own file system, therefore, when developing in WSL2, I need a separate workspace and a separate instance of git.

Follow these [instructions](https://docs.microsoft.com/en-us/windows/wsl/tutorials/wsl-git), in particular the bit about the [credential manager](https://docs.microsoft.com/en-us/windows/wsl/tutorials/wsl-git#git-credential-manager-setup).


And that's me done... I actually haven't run any container yet, I'll need to resurrect some old project of mine, or start a new one...

