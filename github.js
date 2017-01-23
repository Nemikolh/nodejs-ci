'use strict';

const os = require('os');
const restler = require('restler');

const ip_address = os.networkInterfaces().eth0[0].address;

class GithubClient {
  constructor(repo, auth_token, port) {
    this.repo = repo;
    this.auth_token = auth_token;
    this.port = port;
  }

  send_status(commit_id, status) {
    restler.post(`https://github.com/api/v3/repos/${this.repo}/statuses/${commit_id}`, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'node-ci',
        'Content-Type': 'application/json',
        'Authorization': `token ${this.auth_token}`,
      },
      data: JSON.stringify({
        target_url: `http://${ip_address}:${this.port}/build/${commit_id}`,
        state: status.state,
        description: status.description,
        context: `node-ci/${os.hostname()}`,
      })
    }).on('complete', (data, response) => {
      if (response.statusCode == 400) {
        console.log(data && data.message);
      }
    });
  }
}

module.exports.Waiting = {
  state: "pending",
  description: "Waiting for other Job to terminate",
};

module.exports.Pending = {
  state: "pending",
  description: "Running tests...",
};

module.exports.Success = {
  state: "success",
  description: "Tests passed",
};

module.exports.Failure = (description) => {
  return {
    state: "failure",
    description: description,
  };
};

module.exports.GithubClient = GithubClient;
