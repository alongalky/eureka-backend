# Eureka backend
## Metrics and analytics
Access analytics through Azure Application Insights, using the following:

- [local](https://analytics.applicationinsights.io/subscriptions/fcb1f62a-582d-445d-89b4-f555390ff683/resourcegroups/eureka-local/components/eureka-local#/discover/home?apptype=Node.JS) environment
- [dev](https://analytics.applicationinsights.io/subscriptions/fcb1f62a-582d-445d-89b4-f555390ff683/resourcegroups/eureka-dev-2/components/eureka-dev#/discover/query/main?apptype=Node.JS) environment

## Configuring Cloud environment
### Google Cloud Engine
Please follow [this](https://docs.google.com/document/d/1PUvtZn2R9F5Lrld2w8-vXXuXeOx88JxSQwRaEMDhbzI/edit) document for
an explenation on how to create the base VM to host Eureka's tasks.

## Deploying with Google App Engine
### Setting up
Set up the Google Cloud CLI as explained [here](https://cloud.google.com/sdk/docs/).

### Deploying
Once you have everything set up, run one of the following to deploy:

```
gcloud app deploy dev.yaml --project dotted-vim-164110 --stop-previous-version
```
```
gcloud app deploy beta.yaml --project eureka-beta --stop-previous-version
```

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
