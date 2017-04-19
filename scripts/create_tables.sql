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
  `spending_quota` decimal(15,2) NOT NULL,
  `vm_quota` INT NOT NULL,
  PRIMARY KEY (account_id)
);

CREATE TABLE machines
(
  `machine_id` VARCHAR(45) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `ssh_address` VARCHAR(255) NOT NULL,
  `account_id` VARCHAR(45) NOT NULL,
  PRIMARY KEY (machine_id),
  FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

CREATE TABLE tasks
(
  `task_id` VARCHAR(45) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `status` VARCHAR(45) NOT NULL,
  `command` VARCHAR(255) NOT NULL,
  `timestamp_initializing` DATETIME NOT NULL,
  `timestamp_running` DATETIME DEFAULT NULL,
  `timestamp_done` DATETIME DEFAULT NULL,
  `tier` VARCHAR(45) NOT NULL,
  `machine_id` VARCHAR(45) NOT NULL,
  PRIMARY KEY (task_id),
  FOREIGN KEY (machine_id) REFERENCES machines(machine_id)
);
