INSERT INTO `accounts` (`account_id`, `name`, `key`, `secret`, `public_key`, `first_name`, `last_name`, `email`, `spending_quota`, `vm_quota`)
  VALUES ('93506318-da47-499e-a6f4-c43bdc1f1eae','Test','Key','Secret','Public Key 1','Rich','Tim','rich.tim@mailinator.com','100.0',10);
INSERT INTO `accounts` 
  VALUES ('f197ac60-596e-4365-bd55-7b11d07a4482','Another Account','Key2','Secret2','Public Key 1','Poor','Bob','poor.bob@mailinator.com','1.0',1);

INSERT INTO `tiers` (`tier_id`, `price_per_hour_in_cent`, `name`, `memory_gb`, `cpu_count`, `local_disk_gb`, `ssd_disk_gb`, `cloud_storage_gb`)
VALUES
('900c4659-4843-4a3f-8e23-8ed3d98f13aa',5.346,'n1-standard-1',3.75,1,20,0,0),
('2b9dd5c2-4b10-4dc3-bf01-22c378435286',10.691,'n1-standard-2',7.5,2,40,0,0),
('6d50a0f7-8607-4b7c-88ee-1aa8158647bc',21.382,'n1-standard-4',15,4,80,0,0),
('ac1fffbe-f796-431b-9441-3a4a928382cc',33.390,'n1-standard-4-ssd',15,4,0,375,0),
('165a107c-0a57-4cad-8451-23d209e22c58',42.524,'n1-standard-8',30,8,120,0,0),
('28d87bb8-ef9c-4daa-8092-abb00ea95298',54.290,'n1-standard-8-ssd',30,8,0,375,0),
('8c84dcde-03bb-4d94-8f5a-d299ef4aa035',96.090,'n1-standard-16-ssd',60,16,0,375,0),
('7921633e-1cb5-49a0-a4b3-4ea9c2765f2e',179.690,'n1-standard-32-ssd',120,32,0,375,0);

INSERT INTO `machines` (`machine_id`, `name`, `account_id`, `vm_id`, `container_id`, `ssh_port`) VALUES
 ('e3fbb152-909d-489b-a385-2e96d12d77fe', 'machina1', '93506318-da47-499e-a6f4-c43bdc1f1eae', 'machinas', 'e23f4c219624', '2001'),
 ('0f89a48f-6fd7-408d-9a8f-f357a38ed880', 'machina2', 'f197ac60-596e-4365-bd55-7b11d07a4482', 'machinas', '1cada835d743', '2000');
