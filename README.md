# XRP Ledger Snapshot Utility
A utility tool developed to collect and verify account balances for all active XRP Ledger accounts at Flare Network's XRP Ledger utility fork. While ledger index 60155580 is the default, the tool can be used to take a snapshot of any ledger index.

## Usage
### Requirements
To use this utility tool you must have a local MongoDB server running. If you don't already have this, you can quickly create one using the provided Docker Compose configuration. Simply run `docker-compose up` after ensuring you have the latest versions of Docker and Docker Compose installed.

In addition, you must install application dependencies by running `yarn install`.

### Take Complete Snapshot
To dump, aggregate and classify data with a single command, use the snapshot task. This will download all necessary data and transform it to the expected format.

Run `yarn start snapshot -n NODE -i INDEX -d DATABASE`, after replacing the following
parameters:
- **NODE**: The XRP Ledger node to dump data from over Websocket Secure (WSS). Taking a snapshot is resource intensive, please use your own node or ask the node operator for permission beforehand.
- **INDEX (optional)**: The ledger index to dump. If you omit this field, 60155580 will be used.
- **DATABASE (optional)**: The name of the database to use for data storage. This name is later used for comparing different data sets. If you omit this field, "default" will be used.

The snapshot procedure may take up to an hour to complete, depending on the XRP Ledger node and your internet connection.

### Run Individual Steps
You can run the different subtasks individually. The previous snapshot task is equivalent to running:
```bash
yarn start dump -n NODE -i INDEX -d DATABASE
yarn start aggregate -d DATABASE
yarn start classify -d DATABASE
```

### Show Snapshot Statistics
After a snapshot has been made you can choose to show statistics about the dumped data.

Run `yarn start statistics` to show statistics for the default database.

#### Arguments
- **-d (optional)**: An alternative database to show statistics for 
- **-t (optional)**: A list of statistical measures to show. The following metrics are currently supported:
  - **total-participating-balance**: Aggregated XRP balance of all active accounts, with a valid message key.
  - **total-participating-count**: Total number of active accounts, with a valid message key.
  
### Compare Multiple Snapshots
To ensure that no single node can act maliciously, you may compare snapshots taken using different nodes.

Run `yarn start compare -d DATABASE_A DATABASE_B ...` to compare the listed
databases.

The result indicates whether the specified snapshots match.

### Calculate XRP:FLR Quota
If you want to calculate the parameters and quota for the distribution formula you can run `yarn start formula`. This command will calulate the total XRP amount, the XRP held by Ripple and the XRP held by non-participating exchanges at the time of the snapshot. The resulting XRP:FLR quota is what will be used for the Spark (FLR) distribution. Like the above command, you can supply the `-d` flag to specify the database name.

### Check Claim Eligibility
If you want to check whether a specific XRP Ledger address is eligible to receive Spark (FLR) you can run `yarn start claimable -a ADDRESS`. This command will check if the account is included in the snapshot and what amount of Spark it is eligible to receive according to the XRP:FLR quota. Like the above command, you can supply the `-d` flag to specify the database name.

### Other Arguments
Most commands also support the following arguments:
- **--dbHost**: The MongoDB database host
- **-p**: The MongoDB database port
- **-d**: The MongoDB database name
- **-f**: Force removal of already existing data

## Testing
The test suite connects to a temporary local rippled instance to enable proper integration testing. This currently limits testing to Linux and MacOS. First download the rippled Docker image provided by Wietse Wind from XRPL Labs with `docker pull xrptipbot/rippledvalidator` then run the test suite with `yarn test`.
