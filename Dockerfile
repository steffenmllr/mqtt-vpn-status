FROM hypriot/rpi-node:6.9

# Install Nodejs
RUN npm install yarn -g

# This caches npm installs
ADD ./yarn.lock /home/app/yarn.lock
ADD ./package.json /home/app/package.json
RUN cd /home/app && yarn

# Copy the app
COPY . /home/app

WORKDIR /home/app
CMD ["yarn", "run", "start"]
