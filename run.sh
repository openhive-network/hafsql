#!/usr/bin/env bash

#echo "Bash version ${BASH_VERSION}..."

install_node() {
  sudo apt -y update
  sudo apt -y install curl
  curl -sL https://deb.nodesource.com/setup_18.x -o nodesource_setup.sh
  sudo bash nodesource_setup.sh
  sudo apt install nodejs
  echo "Node.js v18 installed."
}

help() {
  echo "Usage: $0 COMMAND"
  echo
  echo "Commands: "
  echo "    install_node - install node.js v18"
  echo
  exit
}

case $1 in
install_node)
  install_node
  ;;
*)
  echo "Invalid cmd"
  help
  ;;
esac