# NodeJS based Continuous Integration Server

A CI for node applications. It simply run the following on your repo:

```bash
npm install
npm test
npm run build
```

If running arbitrary code on bare metal scares you, the CI support also
to run in a VM using vagrant.

If your repository provides a Vagrantfile, the CI will use it. Otherwise,
the one at the root of this repository will be used.

## Installation

To use this CI, make sure you have:

* `node` and `npm` installed.
* `git` installed.
* **[optional]** `vagrant` installed.

Once, those requirements are satisfied, clone this repo
and at the root simply run `./ci.js`.

In summary:

```
git clone https://github.com/Nemikolh/nodejs-ci.git
cd node-ci
npm install
./ci.js
```

## Vagrant mode

If you use this project in `vagrant` mode, then you will need
to generate a private/public key pair that vagrant can use.

For this, simply ssh on the vagrant VM (`vagrant ssh`), generate
a key pair (`ssh-keygen -b 4096`) and then copy the public key
in **Settings > Deploy keys > Add deploy key** in your github
repository.

> Note: You need to start the CI first before doing this.

## Usage

The CI can be run with various options. Here is the usage string:

```
Start a ci for node apps. It will run the following commands
in the repo:

  npm install
  npm test

All generated output will be available at /build/:resId

Usage:
    ci -at=<auth_token> -p=<port> <repo> [--vagrant || --bare-metal]
    ci -h | --help | --version

Arguments:
    <repo>              Repository of the form 'user/repo'
    -h --help           Show this message.
    --version           Show the version number.
    -p=<port>           Port number for the ci.
    -at=<auth_token>    Authorization token.
    --vagrant           Use a Vagrantfile provided in the repo or default one if there's none.
    --bare-metal        Bare metal CI. Run tests here.
```
