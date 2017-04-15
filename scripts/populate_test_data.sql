INSERT INTO `accounts` (`account_id`, `name`, `key`, `secret`, `public_key`, `first_name`, `last_name`, `email`, `spending_quota`, `vm_quota`)
  VALUES ('93506318-da47-499e-a6f4-c43bdc1f1eae','Test','Key','Secret','Public Key 1','Rich','Tim','rich.tim@mailinator.com','100.0',10);
INSERT INTO `accounts` 
  VALUES ('f197ac60-596e-4365-bd55-7b11d07a4482','Another Account','Key2','Secret2','Public Key 1','Poor','Bob','poor.bob@mailinator.com','1.0',1);

INSERT INTO `machines` (`machine_id`, `name`, `account_id`) VALUES ('e3fbb152-909d-489b-a385-2e96d12d77fe', 'machina1', '93506318-da47-499e-a6f4-c43bdc1f1eae');
INSERT INTO `machines` (`machine_id`, `name`, `account_id`) VALUES ('0f89a48f-6fd7-408d-9a8f-f357a38ed880', 'machina2', 'f197ac60-596e-4365-bd55-7b11d07a4482');
