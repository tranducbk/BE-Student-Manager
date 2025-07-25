### Installation

- First, clone [this repository](https://github.com/nambt-vbee/student-manager.git) to your local machine

```bash
$ git clone https://github.com/nambt-vbee/student-manager.git
$ cd server
```

- Then, run the following command to install dependencies

```bash
$ npm install or npm i 
```

### Config

Create a .env file in the backend folder and add the following data

```bash
PORT=3003
MONGODB_URL=mongodb://localhost:27017/student-manager
JWT_ACCESS_KEY=JWT_ACCESS_KEY
JWT_REFRESH_KEY=JWT_REFRESH_KEY
EMAIL_SERVICE=gmail
EMAIL_USER=chatgptplus.h5@gmail.com
EMAIL_PASS=ratruongdunghan@#
```


### Running

```bash
$ npm run dev 
```
