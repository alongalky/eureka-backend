# Eureka backend
## Metrics and analytics
Access analytics through Azure Application Insights, using the following:
- [local](https://analytics.applicationinsights.io/subscriptions/fcb1f62a-582d-445d-89b4-f555390ff683/resourcegroups/eureka-local/components/eureka-local#/discover/home?apptype=Node.JS) environment
- [dev](https://analytics.applicationinsights.io/subscriptions/fcb1f62a-582d-445d-89b4-f555390ff683/resourcegroups/eureka-dev/components/eureka-dev#/discover/home?apptype=Node.JS) environment

## Deploying with Google App Engine
### Setting up
Set up the Google Cloud CLI as explained [here](https://cloud.google.com/sdk/docs/).

### Deploying
Once you have everything set up, run `gcloud app deploy` to deploy.

## Linting
In order to lint all project files, run:
```SHELL
npm run lint
```
This will  fix all auto-fixable lint issues.

## Testing
To run all tests run:
```
npm test
```
