---
trigger: manual
---


this is the proper docs

telefunc()
Environment: server.

We install Telefunc by using Telefunc's server middleware telefunc():

// server.js
 
// Server (Express.js/Fastify/...)
 
import { telefunc } from 'telefunc'
 
// Telefunc middleware
app.all('/_telefunc', async (req, res) => {
  const httpResponse = await telefunc({
    // HTTP Request URL, which is '/_telefunc' if we didn't modify config.telefuncUrl
    url: req.url,
    // HTTP Request Method (GET, POST, ...)
    method: req.method,
    // HTTP Request Body, which can be a string, buffer, or stream
    body: req.body,
    // Optional
    context: {
      /* Some context */
    }
  })
  const { body, statusCode, contentType } = httpResponse
  res.status(statusCode).type(contentType).send(body)
})
The context parameter is optional and is only needed if we use getContext(), see API > getContext() > Provide.

telefuncUrl
Environment: server, client.

By default, Telefunc uses the URL pathname /_telefunc to communicate between client and server.

You can use config.telefuncUrl to change that URL.

Basic usage
You always need to set the value twice: on the server- and client-side.

On the server-side:

// Environment: server
 
import { config } from 'telefunc'
 
config.telefuncUrl = '/api/_telefunc'
You usually define server-side configs (import { config } from 'telefunc') at your server entry. For example if you use Express.js:

// /server/index.js
// Environment: server
 
import express from 'express'
import { config } from 'telefunc'
 
const app = express()
 
// Config values can be set here
config.someServerSideSetting = 'some-value'
On the client-side:

// Environment: client
 
import { config } from 'telefunc/client'
 
config.telefuncUrl = '/api/_telefunc'
You can define client-side configs (import { config } from 'telefunc/client') anywhere, just make sure to do it at global client-side code that is always executed. For example /pages/+client.js if you use Vike:

// /pages/+client.js
// Environment: client
 
import { config } from 'telefunc/client'
 
// Config values can be set here
config.someClientSideSetting = 'some-value'
Different domain
If you deploy your frontend and backend at different domain names, then do the following.

// Environment: client
 
import { config } from 'telefunc/client'
 
// The client-side value can be:
// - a URL pathname (such as '/_telefunc')
// - a URL with origin (such as 'https://example.org/api/_telefunc')
// - an IP address (such as '192.158.1.38')
config.telefuncUrl = 'https://example.org/api/_telefunc'
// Environment: server
 
import { config } from 'telefunc'
 
// The server-side value always needs to be a URL pathname (such as '/_telefunc')
config.telefuncUrl = '/api/_telefunc'


disableNamingConvention
Environment: server.

Opt out of the naming convention for event-based telefunctions (removes all related warnings).

// Environment: server
 
import { config } from 'telefunc'
 
config.disableNamingConvention = true
Opting out of the naming convention is perfectly fine, though we recommend having a clear reason for doing so.

We recommend reading Guides > Event-based telefunctions before opting out. It explains why event-based telefunctions lead to increased:

Development speed
Security
Performance
Feel free to reach out if you have questions.

You usually define server-side configs (import { config } from 'telefunc') at your server entry. For example if you use Express.js:

// /server/index.js
// Environment: server
 
import express from 'express'
import { config } from 'telefunc'
 
const app = express()
 
// Config values can be set here
config.someServerSideSetting = 'some-value'


ttpHeaders
Environment: client.

Send additional HTTP headers to be sent along Telefunc HTTP requests.

Usually used for sending authentication headers.

// Environment: client
 
import { config } from 'telefunc/client'
 
config.httpHeaders = {
  Authorization: `Bearer ${token}`
}
You can define client-side configs (import { config } from 'telefunc/client') anywhere, just make sure to do it at global client-side code that is always executed. For example /pages/+client.js if you use Vike:

// /pages/+client.js
// Environment: client
 
import { config } from 'telefunc/client'
 
// Config values can be set here
config.someClientSideSetting = 'some-value'
See also
API > fetch
Guides > Permissions
#167 - Dynamic httpHeaders?

fetch
Environment: client.

You can specify the fetch function that Telefunc uses for making HTTP requests on the client side.

This is useful for customizing the request and response behavior.

// Environment: client
 
import { config } from 'telefunc/client'
import { customFetch } from '../path/to/custom-fetch'
 
config.fetch = customFetch
You can define client-side configs (import { config } from 'telefunc/client') anywhere, just make sure to do it at global client-side code that is always executed. For example /pages/+client.js if you use Vike:

// /pages/+client.js
// Environment: client
 
import { config } from 'telefunc/client'
 
// Config values can be set here
config.someClientSideSetting = 'some-value'

telefuncFiles
Environment: server.

⚠️ This is a beta feature.
If you don't use Telefunc's transformer on your server-side (see Telefunc Transformer) then you need to provide the list of your .telefunc.js files to Telefunc.

You do so by using:

config.telefuncFiles
config.root
// Environment: server
 
import { config } from 'telefunc'
 
// List of telefunc files
config.telefuncFiles = [
  require.resolve('./hello.telefunc.mjs')
]
 
// The root directory of the project
config.root = __dirname
See also config.root.

You usually define server-side configs (import { config } from 'telefunc') at your server entry. For example if you use Express.js:

// /server/index.js
// Environment: server
 
import express from 'express'
import { config } from 'telefunc'
 
const app = express()
 
// Config values can be set here
config.someServerSideSetting = 'some-value'


root
Environment: server.

⚠️ This is a beta feature.
If you use config.telefuncFiles, then you also need to set config.root.

// Environment: server
 
import { config } from 'telefunc'
 
// Your project's root directory
config.root = __dirname
The config.root setting is only needed if you use config.telefuncFiles.

You usually define server-side configs (import { config } from 'telefunc') at your server entry. For example if you use Express.js:

// /server/index.js
// Environment: server
 
import express from 'express'
import { config } from 'telefunc'
 
const app = express()
 
// Config values can be set here
config.someServerSideSetting = 'some-value'


Edit this page
onBug()
Environment: server.

To track bugs, we use onBug():

import { onBug } from 'telefunc'
 
onBug(err => {
  // ...
})
This allows us, for example, to install the tracker code of some tracking service (Sentry, Bugsnag, Rollbar, ...).

onBug() is called:

When a telefunction throws an error that is not Abort(). (In other words, our telefunction has a bug.)
When Telefunc throws an error. (In other words, Telefunc has a bug).
throw Abort() does not trigger onBug(). It's expected that throw Abort() may be called (when some third-party erroneously calls a telefunction). In other words, throw Abort() isn't a bug.


Edit this page
onAbort()
Environment: client.

The onAbort() hook is called whenever the browser makes a telefunction call that fails because the telefunction ran throw Abort().

// Environment: client
 
import { onAbort } from 'telefunc/client'
 
onAbort(err => {
  if (err.abortValue.notLoggedIn) {
    // Redirect user to login page
    window.location.href = '/login'
  }
})
The onAbort() hook is usually used for implementing getContext() wrappers, see Guides > Permissions > getContext() wrapping.

See


getContext()
Environment: server.

getContext() enables telefunctions to access contextual information.

// TodoList.telefunc.ts
// Environment: server
 
import { getContext } from 'telefunc'
 
export async function onLoad() {
  const context = getContext()
  const { user } = context
  const todoItems = await Todo.findMany({ select: 'text', authorId: user.id })
  return {
    todoItems,
    userName: user.name
  }
}
It's most commonly used for implementing permissions, see Guides > Permissions.

Provide
Before we can use getContext(), we need to provide the context object to Telefunc's Server Middleware:

// server.js
 
// Server (Express.js/Fastify/...)
 
import { telefunc } from 'telefunc'
 
// Telefunc middleware
app.all('/_telefunc', async (req, res) => {
  // Authentication middlewares (e.g. Passport.js or Grant) usually provide information
  // about the logged-in user on the `req` object:
  const user = req.user
  // Or when using a third-party authentication provider (e.g. Auth0):
  const user = await authProviderApi.getUser(req.headers)
 
  const httpResponse = await telefunc({
    // We provide the context object here:
    context: {
      user,
    },
    url: req.url,
    method: req.method,
    body: req.body,
  })
 
  const { body, statusCode, contentType } = httpResponse
  res.status(statusCode).type(contentType).send(body)
})
Access
If you get this error:

[telefunc][Wrong Usage][getContext()] Cannot access context object, see https://telefunc.com/getContext#access
Then this means that getContext() was called after an await operator:

// TodoList.telefunc.js
 
export async function myTelefunction() {
  await something()
  // ❌ Bad: we should call getContext() before `await something()`
  const context = getContext()
}
Make sure to call getContext() before any await operators:

// TodoList.telefunc.js
 
export async function myTelefunction() {
  // ✅ Good: we call getContext() before `await`
  const context = getContext()
  await something()
}
TypeScript
We can use Telefunc.Context to globally set the type of const context = getContext():

// TelefuncContext.d.ts
 
import 'telefunc'
import type { User } from './User.ts'
 
declare module 'telefunc' {
  namespace Telefunc {
    interface Context {
      user: null | User
    }
  }
}
// User.ts
 
export type User = { id: number }
// *.telefunc.ts
 
import { getContext } from 'telefunc'
 
export async function someTelefunction() {
  // TypeScript knows that `user.id` is a `number`
  const { user } = getContext()
}
We can also directly set const context = getContext<MyContext>():

// *.telefunc.ts
 
import { getContext } from 'telefunc'
 
type Context = {
  userId: number
}
 
export async function someTelefunction() {
  // TypeScript knows that `userId` is a `number`
  const { userId } = getContext<Context>()
}