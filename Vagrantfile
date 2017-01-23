# -*- mode: ruby -*-
# vi: set ft=ruby :

# All Vagrant configuration is done below. The "2" in Vagrant.configure
# configures the configuration version (we support older styles for
# backwards compatibility). Please don't change it unless you know what
# you're doing.
Vagrant.configure(2) do |config|

  config.vm.box = "ubuntu/trusty64"

  config.vm.synced_folder "./repo", "/vagrant", disabled: false

  config.vm.provision "shell", privileged: false, inline: <<-SHELL
    sudo apt-get install -y language-pack-en git
    curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.1/install.sh | bash
    echo 'export NVM_DIR="$HOME/.nvm"
    . "$NVM_DIR/nvm.sh"
    ' >> .profile
    . "$HOME/.nvm/nvm.sh"
    nvm install stable
    npm config --global set proxy $HTTP_PROXY
  SHELL

  if Vagrant.has_plugin?("vagrant-proxyconf")
    config.proxy.https    = ENV['HTTPS_PROXY'] || ENV['https_proxy']
    config.proxy.http     = ENV['HTTP_PROXY']  || ENV['http_proxy']
    config.proxy.no_proxy = "localhost,127.0.0.1"
    config.proxy.enabled  = { npm: false }
  end
end
