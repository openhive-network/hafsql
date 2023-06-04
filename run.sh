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

install() {
  npm install
}

start() {
  npm run start
}

stop() {
  npm run stop
}

restart() {
  npm run restart
}

logs() {
  npm run logs
}

help() {
  echo "Usage: $0 COMMAND"
  echo
  echo "Commands: "
  echo "    install_node - install node.js v18"
  echo "    install - install dependencies"
  echo "    start - start hafsql"
  echo "    stop - stop hafsql"
  echo "    restart - restart hafsql"
  echo "    logs - display logs"
  echo
  exit
}

case $1 in
install_node)
  install_node
  ;;
install)
  install
  ;;
start)
  start
  ;;
stop)
  stop
  ;;
restart)
  restart
  ;;
logs)
  logs
  ;;
*)
  echo "Invalid cmd"
  help
  ;;
esac