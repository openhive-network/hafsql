import {
  Application,
  isHttpError,
  oakCors,
  Router,
  STATUS_TEXT,
} from '../deps.ts'
import { print } from '../app/helpers/utils/print.ts'
import { apiRouter } from './mod.ts'

export const startAPI = async () => {
  const app = new Application()
  app.use(async (ctx, next) => {
    try {
      await next()
    } catch (err) {
      if (isHttpError(err)) {
        ctx.response.status = err.status
        ctx.response.body = {
          status: err.status,
          error: STATUS_TEXT[err.status],
          message: err.message,
        }
      } else {
        throw err
      }
    }
  })

  const router = new Router()
    .use(apiRouter.routes())

  // app.addEventListener('error', (e) => {
  // console.log(e.error)
  // })

  app.use(oakCors())
  app.use(router.routes())

  app.listen({ port: 3000 })
  print('[API] API started on port 3000')
}

startAPI()
