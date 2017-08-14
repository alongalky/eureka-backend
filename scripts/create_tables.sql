CREATE TABLE accounts
(
  `account_id` VARCHAR(45) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `key` VARCHAR(45) NOT NULL,
  `secret` VARCHAR(45) NOT NULL,
  `public_key` VARCHAR(1024) NOT NULL,
  `first_name` VARCHAR(255) NOT NULL,
  `last_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `spending_quota` DECIMAL(19,4) NOT NULL,
  `vm_quota` INT NOT NULL,
  PRIMARY KEY (account_id)
);

CREATE TABLE machines
(
  `machine_id` VARCHAR(45) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `vm_id` VARCHAR(255) NOT NULL,
  `container_id` VARCHAR(255) NOT NULL,
  `ssh_port` VARCHAR(5) NOT NULL,
  `account_id` VARCHAR(45) NOT NULL,
  `docker_within_docker` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (machine_id),
  FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

CREATE TABLE tiers
(
  `tier_id` VARCHAR(45) NOT NULL,
  `price_per_hour_in_cent` DECIMAL(19,4) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `memory_gb` DECIMAL(19,4) NOT NULL,
  `cpu_count` INT NOT NULL,
  `local_disk_gb` INT NOT NULL,
  `ssd_disk_gb` INT NOT NULL,
  `cloud_storage_gb` INT NOT NULL,
  `cloud_type_name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (tier_id)
);

CREATE TABLE tasks
(
  `task_id` VARCHAR(45) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `status` VARCHAR(45) NOT NULL,
  `workingDirectory` VARCHAR(255) NOT NULL DEFAULT '',
  `command` VARCHAR(255) NOT NULL,
  `timestamp_initializing` DATETIME NOT NULL,
  `timestamp_running` DATETIME DEFAULT NULL,
  `timestamp_done` DATETIME DEFAULT NULL,
  `machine_id` VARCHAR(45) NOT NULL,
  `tier_id` VARCHAR(45) NOT NULL,
  PRIMARY KEY (task_id),
  FOREIGN KEY (machine_id) REFERENCES machines(machine_id),
  FOREIGN KEY (tier_id) REFERENCES tiers(tier_id),
  UNIQUE (name, machine_id)
);
