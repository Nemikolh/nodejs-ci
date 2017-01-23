const GithubClient = require('./github').GithubClient;
const Success = require('./github').Success;
const Failure = require('./github').Failure;
const Pending = require('./github').Pending;
const Waiting = require('./github').Waiting;

const spawn = require('child_process').spawn;
const spawnSync = require('child_process').spawnSync;
const path = require('path');
const fs = require('fs');


class LP {
  constructor(commands) {
    this.commands = commands.reverse();
  }
  execute(ci, commit_id) {
    let command = this.commands.pop();
    if (command) {
      let cp = spawn(command[0], command[1], command[2]);
      this.log_child_process(cp, commit_id);
      cp.on('close', (code) => {
        if (code != 0) {
          ci.client.send_status(commit_id, command[3]);
          ci.next_tests();
          return;
        }
        this.execute(ci, commit_id);
      });
    } else {
      ci.client.send_status(commit_id, Success);
      ci.next_tests();
    }
  }
  log_child_process(child_process, commit_id) {
    child_process.stdout.on('data', (data) => {
      fs.appendFile(`./build/${commit_id}`, data);
    });
    child_process.stderr.on('data', (data) => {
      fs.appendFile(`./build/${commit_id}`, data);
    });
  } 
}


class GithubCI {
  constructor(github_client) {
    this.client = github_client;
    this.queue = [];
    this.is_ci_running = false;
    this.use_vagrant = false;
  }
  prepare(repo, use_vagrant, bare_metal) {
    // Clone repo in ./repo
    let full_repo_name = `https://github.com/${repo}.git`;
    spawnSync('git', ['clone', full_repo_name, 'repo']);
    // If bare_metal, skip
    if (!bare_metal) {
      // look for a vagrant file
      try {
        let vagrant_file = fs.lstatSync('./repo/Vagrantfile');
        if (vagrant_file.isFile()) {
          this.use_vagrant = spawnSync('vagrant', ['up'], {
            cwd: path.join(__dirname, '/repo'),
            env: process.env
          }).status == 0;
          return;
        }
      } catch (e) {
        // Couldn't find a vagrant file but forced to use vagrant
        if (use_vagrant) {
          this.use_vagrant = true;
          // Use the providied vagrant file with this repo
          let success = spawnSync('vagrant', ['up'], {
            cwd: path.join(__dirname, '/repo'),
            env: process.env,
            stdio: 'inherit'
          }).status == 0;
          if (!success) {
            console.log(`Couldn't start vagrant!`);
            process.abort();
          }
        }
      }
    }
  }
  process_pr(commit_id) {
    this.queue.push(commit_id);
    if (this.is_ci_running) {
      this.client.send_status(commit_id, Waiting);
    } else {
      this.run_tests();
    }
  }

  next_tests() {
    if (this.queue.length > 0) {
      this.run_tests();
    } else {
      this.is_ci_running = false;
    }
  }

  run_tests() {

    // Mark the CI has busy
    this.is_ci_running = true;

    // Get the commit id
    let commit_id = this.queue.pop();
    this.client.send_status(commit_id, Pending);

    // Common options
    let co = {
      cwd: path.join(__dirname, `/repo/`),
      env: process.env,
    };

    // Bare metal
    let executor = new LP([
      ['git', ['fetch', '--all'], co, Failure('Git pull failed! (?)')],
      ['git', ['checkout', '--quiet', commit_id], co, Failure('Git checkout failed! (?)')],
      ['npm', ['install'], co, Failure('Install failed!')],
      ['npm', ['test'], co, Failure('Tests failed!')],
      ['npm', ['run', 'build'], co, Failure('Build failed!')],
    ]);

    // Vagrant
    let vagrant_executor = new LP([
      ['vagrant', ['ssh', '-c', 'cd /vagrant; git fetch --all'], co, Failure('Git pull failed in vagrant!')],
      ['vagrant', ['ssh', '-c', `cd /vagrant; git checkout --quiet ${commit_id}`], co, Failure('Git checkout failed in vagrant!')],
      ['vagrant', ['ssh', '-c', 'cd /vagrant; npm install'], co, Failure('Install failed!')],
      ['vagrant', ['ssh', '-c', 'cd /vagrant; npm test'], co, Failure('Tests failed!')],
      ['vagrant', ['ssh', '-c', 'cd /vagrant; npm run build'], co, Failure('Build failed!')],
    ]);

    if (this.use_vagrant) {
      vagrant_executor.execute(this, commit_id);
    } else {
      executor.execute(this, commit_id);
    }
  }

}


module.exports = function(use_vagrant, bare_metal, repo, auth_token, port) {
  let client = new GithubClient(repo, auth_token, port);

  let ci = new GithubCI(client);
  ci.prepare(repo, use_vagrant, bare_metal);
  return ci;
}
