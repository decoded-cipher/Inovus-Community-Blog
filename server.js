const path = require('path')
const express = require('express')

const app = express()
 
const publicDirectoryPath = path.join(__dirname, '/public');
app.use(express.static(publicDirectoryPath));

app.set('view engine', 'hbs');

app.get('/', (req, res) => {
    res.render('blog-fullwidth-3')
});
 
app.listen(8000)