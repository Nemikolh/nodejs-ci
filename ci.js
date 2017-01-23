#!/usr/bin/env node
'use strict';
const docopt = require('docopt').docopt;
const express = require('express');
const bodyParser = require('body-parser');
const ci_prepare = require('./ci_prepare');
const app = express();

const USAGE = `
Start a ci Node apps. It will run the following commands
in the repo:

  npm install
  npm test

All generated output will be available at /build/:resId

Usage:
    ci <repo> --at=<auth_token> --p=<port> [--vagrant | --bare-metal]
    ci -h | --help | --version

Arguments:
    <repo>              Repository of the form 'user/repo'
    -h --help           Show this message.
    --version           Show the version number.
    --p=<port>          Port number for the ci.
    --at=<auth_token>   Authorization token.
    --vagrant           Use a Vagrantfile provided in the repo or default one if there's none.
    --bare-metal        Bare metal CI. Run tests here.
`;

const packageJson = require('./package.json');
const options = docopt(USAGE, {version: packageJson.version});
const port = options['--p'];
const use_vagrant = options['--vagrant'];
const bare_metal = options['--bare-metal'];
const repository = options['<repo>'];
const auth_token = options['--at'];

// Prepare the repository
let github = ci_prepare(use_vagrant, bare_metal, repository, auth_token, port);

// Configure roots
app.use(bodyParser.json());


app.get('/build/:resId', (req, res) => {
  let res_id = req.params.resId;
  if (res_id) {
    let options = {
      root: __dirname + '/build/',
      dotfiles: 'deny',
      headers: {
        'x-timestamp': Date.now(),
        'x-sent': true,
        'Content-Type': 'text/plain; charset=utf-8'
      }
    };
    res.sendFile(res_id, options, (err) => {
      if (err) {
        console.log(err);
        res.status(err.status).end();
      } else {
        console.log(`Sent build log for ${res_id}`);
      }
    });
  } else {
    res.sendStatus(404);
  }
});

app.post('/pr', (req, res) => {
  let pr = req.body.pull_request;
  let repo = req.body.repository !== undefined && req.body.repository.full_name;
  let head = pr !== undefined && pr.head;
  let commit_id = head !== undefined && head.sha;

  if (commit_id && repo === repository) {
    github.process_pr(commit_id);
  } else {
    console.log(`Ignored request: \n ${JSON.stringify(req.body)}`);
  }
  res.sendStatus(200);
});

app.listen(port, () => console.log(`CI ready on ${port}`));
