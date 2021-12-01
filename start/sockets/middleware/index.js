'use strict';

//Utils
const MiddlewareBase = require('@adonisjs/middleware-base');
const jwt = use('jsonwebtoken');
const Env = use('Env');
const CoCompose = require('co-compose');
const Config = use('Adonis/Src/Config');
const { resolver } = require('@adonisjs/fold');
const { namedMiddleware } = Config.get('middleware');

//Models
const User = use('App/Models/User');

class SocketIoMiddleware {
  constructor() {
    this.middlewareBase = new MiddlewareBase('wsHandle');
    this.middlewareBase.registerNamed(namedMiddleware);
  }

  /**
   * Invoked at runtime under the middleware chain. This method will
   * resolve the middleware namespace from the IoC container
   * and invokes it.
   *
   * @method resolveMiddleware
   *
   * @param  {String|Function} middleware
   * @param  {Array}           options
   *
   *
   * @private
   */
  async resolveMiddleware(middleware, options) {
    try {
      const handlerInstance = resolver.resolveFunc(middleware.namespace);
      const args = options.concat([middleware.params]);
      await handlerInstance.method(...args);
    } catch (error) {
      this.middlewareError = error;
    }
  }

  /**
   * This method will
   * return the user model result using a decoded token
   *
   * @method getUserByDecodedJWT
   *
   * @param  {Object} tokenDecoded
   *
   * @private
   */
  async getUserByDecodedJWT(tokenDecoded) {
    try {
      const { data: { user: { id: userId } = {} } = {} } = tokenDecoded;
      const user = await User.find(userId);
      return {
        success: true,
        user
      };
    } catch (error) {
      return {
        success: false,
        error
      };
    }
  }


   /**
   * This method will validate the siganture of the token
   * and return the data if its valid
   *
   * @method validateJWTSign
   *
   * @param  {Object} token
   *
   * @private
   */
  validateJWTSign(token){
    return jwt.verify(token, Env.get('PUBLIC_KEY').replace(/\\n/gm, '\n'));
  }


  /**
   * Applies the middleware rules to a socket connection. Pass empty
   * array when no named middleware are supposed to be
   * executed.
   *
   * @method apply
   *
   * @param  {SocketNameSpace} socketNamespace
   * @param  {Array} namedMiddlewares
   *
   * @return {Runner}
   */
  async apply(socketNamespace, namedMiddlewares = []) {
    this.namedMiddlewares = namedMiddlewares;
    socketNamespace.use(async (socket, next) => {
      try {
        this.middlewareError = null;
        const middlewares = this.middlewareBase._middleware.global.concat(
          this.middlewareBase._compileNamedMiddleware(this.namedMiddlewares)
        );

        const tokenData = this.validateJWTSign(socket.handshake.auth.token)
        const userRes = await this.getUserByDecodedJWT(tokenData);

        if (!userRes.success) {
          throw userRes.error;
        }

        const middlewareParamas = {
          user: userRes.user
        };

        await new CoCompose()
          .register(middlewares)
          .runner()
          .resolve(await this.resolveMiddleware.bind(this))
          .params([middlewareParamas])
          .run();

        if (this.middlewareError) {
          throw this.middlewareError;
        }

        socket.join(`user:${userRes.user.id}`);
        
        next();
      } catch (error) {
        next(new Error(error));
      }
    });
  }
}

module.exports = SocketIoMiddleware;
