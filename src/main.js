import  express from  'express'
import handlebars from 'express-handlebars'
import fetch from 'node-fetch'
import { normalize, schema } from "normalizr";

import { Server as HttpServer } from  'http'
import { Server as Socket } from 'socket.io'

import ContenedorMongoD from '../contenedores/ContenedorMongoDb.js'

import {routerProductos} from '../routes/routerProducto.js'

const app = express()

const httpServer = new HttpServer(app)
const io = new Socket(httpServer)

const productos= new ContenedorMongoD('productosEje11')
const mensajes= new ContenedorMongoD('mensajesEje11')

const cargarProductoRandom = async() =>{
    let rdo
    await fetch('http://localhost:8080/api/productos-test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    }).then(res => res.json())
      .then(json => rdo=json);   
      return rdo
}

const getAllNormalizados= async()=>{//    getAll(): Object[] - Devuelve un array con los objetos presentes en el archivo.
    try{
        const originalData= await mensajes.getAll();
        let auxData= new Object({id: 'mensajes', mensajes: originalData})
        const tamanioAntes = JSON.stringify(originalData).length

        const authorSchema = new schema.Entity('author',{idAttribute:"id"});
        const messageSchema = new schema.Entity('mensaje',{
            author: authorSchema})
        const allMessageSchema= new schema.Entity('mensajes',{
            mensajes:[ messageSchema]});
        const normalizedData = normalize(auxData,allMessageSchema);
        
        const tamanioDespues= JSON.stringify(normalizedData).length
        const dataIntegrada= new Object({antes: tamanioAntes, despues: tamanioDespues, mensajesNormalizado: normalizedData })
        //return normalizedData
        return dataIntegrada
    }catch(error){
        //const contenido = []
        const dataIntegrada= new Object({antes: 0 , despues: 0, mensajesNormalizado: [] })
        return dataIntegrada // JSON.parse(contenido)
    }
}


//--------------------------------------------
// configuro el socket
io.on('connection', async socket => {
    console.log('Nuevo cliente conectado!');

    // carga inicial de producto
    socket.emit('productos',await productos.getAll())

    // carga inicial de productosRandom
    socket.emit('productosRandom',await cargarProductoRandom())

    // actualizacion de producto
    socket.on('updateProducto', async producto => {
        await productos.save(producto)
        io.sockets.emit('productos', await productos.getAll());
    })

    // carga inicial de mensajes
    socket.emit('mensajes', await getAllNormalizados())//  await mensajes.getAll())

    // actualizacion de mensajes
    socket.on('updateMensaje', async mensaje => {
        await mensajes.save(mensaje)
        io.sockets.emit('mensajes', await getAllNormalizados())// await mensajes.getAll())
    })
});

//--------------------------------------------
// agrego middlewares

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

//**  Manejador de plantillas */
app.engine('hbs', handlebars({
    extname: 'hbs',
    defaultLayout: 'default',
    layoutDir: "/views/layouts",
}))

app.set('view engine', 'hbs');
app.set('views', "./views");

app.use('/api',routerProductos)

//--------------------------------------------
// inicio el servidor

const PORT=8080
const server = httpServer.listen(PORT, () => {
    console.log(`Conectado al puerto ${server.address().port}`)
})
server.on('error', (error) => {
    console.log('Ocurrio un  error...')
    console.log(error)
})
