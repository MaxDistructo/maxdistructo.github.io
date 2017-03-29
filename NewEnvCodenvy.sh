#!/bin/bash
wget -q -P /home/user http://dist.springframework.org.s3.amazonaws.com/release/GRAILS/grails-2.4.4.zip && cd /home/user && unzip grails-2.4.4.zip && rm -rf grails-2.4.4.zip
ENV GRAILS_HOME /home/user/grails-2.4.4
echo “export GRAILS_HOME=$GRAILS_HOME” >> /home/user/.bashrc
ENV PATH $GRAILS_HOME/bin:$PATH
echo “export PATH=$PATH” >> /home/user/.bashrc
mkdir /home/user/app
ADD $app$ /home/user/app/$app$
cd /home/user/app && unzip grails-petclinic.zip && rm -r grails-petclinic.zip
