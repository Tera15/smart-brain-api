const express = require('express'); //importing express
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const port = process.env.PORT || 3001;
    

   const db = knex({
    client: 'pg',
    connection: {
      connectString : process.env.DATABASE_URL,
      ssl: true,
    
    }
  });

 // //returns a promise from the database
//   db.select('*').from('users').then(data => {
//       console.log(data)
//   })

//initializing express
const app = express();
app.use(cors())
//initializing bodyParser middleware
app.use(bodyParser.json());


app.get('/', (req,res) => {
    res.send('hi its working'); 
})

app.post('/signin', (req, res)=>{
    db.select('email', 'hash').from('login')
    .where("email", "=", req.body.email)
    .then(data => {
       const isValid = bcrypt.compareSync(req.body.password, data[0].hash)
       if (isValid) {
        return db.select('*').from('users') //always return 
           .where('email', '=', req.body.email)
           .then(user => {
               res.json(user[0])
           })
           .catch(err => status(400).json('unable to get user'))
       } else {
        res.status(400).json('wrong credentials')
       }
       
    })
    .catch(err => res.status(400).json('wrong credentials'))    
})

    app.post('/register', (req, res) => {
        const { email, name, password} = req.body;
        const hash = bcrypt.hashSync(password)
        db.transaction(trx => { // use transactions when you want to do more than one thing at once
            trx.insert({
                hash: hash,
                email: email
            })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            return trx('users')
            .into('users') // kinex 
            .returning('*')
            .insert({
                email: loginEmail[0],
                name: name,
                joined: new Date()
            })
            .then(user => {
                res.json(user[0]); 
            })
            .then(trx.commit)
            .catch(trx.rollback)
        })
        .catch( err => res.status(400).json('unable to register'))
    }) 
})

app.get('/profile/:id', (req, res) =>{
    const {id} = req.params
    db.select('*').from('users')
    .where({id})
    .then(user => {
        if (user.length) {
         res.json(user[0])
        } else {
            res.status(400).json('notFound')
        }
       
    })
    .catch(err => res.status(400).json('error getting user'))
  
})

app.put('/image', (req, res)=>{
  const {id} = req.body;
  db('users').where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries => {
        res.json(entries[0]);
    })
    .catch(err => res.status(400).json('unable to get entries'))

})

app.listen(port, ()=>{
    console.log(`app is running on port:${port}`)
})