# Eureka backend
## Deploying with AWS Elastic Beanstalk
### Setting up
1. You first need to have the [AWS CLI](http://docs.aws.amazon.com/cli/latest/userguide/installing.html), and set up your profile by running:

   bla bla

   ```sh
   aws configure --profile <profile-name>
   ```

   This will ask you for _key_id_ and _access_key_, and save them in ~/.aws/credentials.

2. Install the [EBS CLI](http://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html). 

3. Clone the eureka repo, and run `eb init` in the repo directory. This will create the `./elasticbeanstalk/config.yml` file. 

   Change 4 fields in there: the _profile_, _default_region_, _application_name_, and _environment_. These need to match the real environment for the deployment to work.

### Deploying
Once you have everything set up, runnning `eb deploy` should work.