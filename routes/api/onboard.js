const util = require('util')
const logger = require('../../logger/logger')()
const uuidv4 = require('uuid').v4
const exec = require('child_process').exec

module.exports = ({ database, config }) => ({
  signup: (req, res) => {
    req.checkBody('name').notEmpty().isLength({min: 1, max: 255})
    req.checkBody('first_name').notEmpty().isLength({min: 1, max: 255})
    req.checkBody('last_name').notEmpty().isLength({min: 1, max: 255})
    req.checkBody('email').notEmpty().isLength({min: 1, max: 255})

    return req.getValidationResult()
      .then(result => {
        if (!result.isEmpty()) {
          return res.status(422).send('There have been validation errors: ' + util.inspect(result.array()))
        }

        const accountId = uuidv4()
        const key = uuidv4()
        const secret = uuidv4()
        const account = {
          account_id: accountId,
          name: req.body.name,
          key,
          secret,
          first_name: req.body.first_name,
          last_name: req.body.last_name,
          email: req.body.email,
          spending_quota: 100.0,
          vm_quota: 10,
          public_key: 'ssh-rsa'
        }
        database.accounts.createAccount(account)
          .then(() => {
            const machineId = uuidv4()
            const privkeyPath = '/ugly_privkey'
            const command = `
              export account=${account.account_id}
              export PROJECT_NAME=${config.google.project}
              (
                cd /tmp
                mkdir $account
                rm -f $account/eureka_key*
                ssh-keygen -f $account/eureka_key -N "" -q
                userconfigfile=$account/eureka.config.yaml
                echo "key: ${account.key}" > $userconfigfile
                echo "secret: ${account.secret}" >> $userconfigfile
                echo "account: ${account.account_id}" >> $userconfigfile
                echo "endpoint: https://$PROJECT_NAME.appspot.com" >> $userconfigfile
                gsutil mb -c regional -p $PROJECT_NAME -l us-east1 gs://eureka-account-$account/
                gsutil cp $account/eureka_key gs://$PROJECT_NAME-privatekeys/$account/
                gsutil cp $account/eureka.config.yaml gs://$PROJECT_NAME-configfiles/$account/
              ) &>/dev/null

              export machinas_ip=$(gcloud compute instances list --project $PROJECT_NAME | grep machinas-$PROJECT_NAME | awk '{print $5}')
              container_port=$(
                eval \`ssh-agent -s\` >/dev/null
                ssh-add ${privkeyPath} >/dev/null
                ssh -o StrictHostKeyChecking=no -A uglydemo@$machinas_ip "
                  (
                    sudo mkdir /mnt/eureka-account-$account
                    sudo gcsfuse eureka-account-$account /mnt/eureka-account-$account
                    git clone git@bitbucket.org:alongalky/utility-scripts.git
                    cd utility-scripts/dockerfiles/numpy
                    git pull
                    sudo docker build . -t numpy-ssh
                    sudo docker run -i -t -d -p 3000-4000:22 -v /mnt/eureka-account-$account/:/keep -e 'PUBLIC_KEY=' numpy-ssh
                  ) &>/dev/null
                  container=\\$(sudo docker ps | sed -n '2p' | awk '{print \\$1}')
                  port=\\$(sudo docker port \\$container | sed -rn 's/.+:(.+)\\$/\\1/p')
                  echo -n \\$container \\$port
                "
              )
              echo -n $container_port | tail -n-1
            `
            return new Promise((resolve, reject) => exec(command, {}, (error, stdout, stderr) => {
              if (error) {
                reject(stderr)
              } else {
                resolve(stdout)
              }
            }))
              .then(containerPort => {
                containerPort = containerPort.toString()
                const machine = {
                  machine_id: machineId,
                  name: 'machina',
                  account_id: account.account_id,
                  vm_id: `machinas-${config.google.project}`,
                  container_id: containerPort.split(' ')[0],
                  ssh_port: containerPort.split(' ')[1]
                }

                return database.machines.createMachine(machine)
                  .then(() => {
                    res.json({
                      success: true,
                      message: 'Account created and onboarded succesfully',
                      account,
                      machine
                    })
                  })
              })
          })
      .catch(err => {
        logger.error(err)
        res.sendStatus(500)
      })
      })
      .catch(err => {
        logger.error(err)
        res.sendStatus(500)
      })
  }
})
