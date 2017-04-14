const runInstance = ({ database, aws, params }) => {
  const ec2 = new aws.EC2()
  ec2.runInstances(
    {
      ImageId: 'ami-a58d0dc5',
      InstanceType: 't2.nano',
      SecurityGroupsIds: [ 'sg-f1132a89' ],
      MinCount: 1,
      MaxCount: 1
    }).promise()
  .then(result => {
    const instanceId = result.Instances[0].InstanceId
    console.log("Created instance %s for account %s", instanceId, account)

    // Tag instance
    ec2.createTags(
      {
        Resources: [ instanceId ],
        Tags: [ {
          Key: 'account',
          Value: account
        }],
      }).promise()
    .then(() => {
      console.log("Tagging instance success")
    })
    .catch(err => {
      console.log("Tagging instance error", err)
    })
  })
  .catch(err => {
    console.err("Could not create instance", err)
    res.status(500).send({message: "Could not create instance"})
    task.changeStatus(ERROR)
    return
  })
}

module.exports = (database, aws) => {
  runInstance: runInstance(database, aws)
}
