
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model BitcoinPrice
 * 
 */
export type BitcoinPrice = $Result.DefaultSelection<Prisma.$BitcoinPricePayload>
/**
 * Model DataUpdate
 * 
 */
export type DataUpdate = $Result.DefaultSelection<Prisma.$DataUpdatePayload>
/**
 * Model ApiUsage
 * 
 */
export type ApiUsage = $Result.DefaultSelection<Prisma.$ApiUsagePayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more BitcoinPrices
 * const bitcoinPrices = await prisma.bitcoinPrice.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more BitcoinPrices
   * const bitcoinPrices = await prisma.bitcoinPrice.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.bitcoinPrice`: Exposes CRUD operations for the **BitcoinPrice** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more BitcoinPrices
    * const bitcoinPrices = await prisma.bitcoinPrice.findMany()
    * ```
    */
  get bitcoinPrice(): Prisma.BitcoinPriceDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.dataUpdate`: Exposes CRUD operations for the **DataUpdate** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more DataUpdates
    * const dataUpdates = await prisma.dataUpdate.findMany()
    * ```
    */
  get dataUpdate(): Prisma.DataUpdateDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.apiUsage`: Exposes CRUD operations for the **ApiUsage** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ApiUsages
    * const apiUsages = await prisma.apiUsage.findMany()
    * ```
    */
  get apiUsage(): Prisma.ApiUsageDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.12.0
   * Query Engine version: 8047c96bbd92db98a2abc7c9323ce77c02c89dbc
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    BitcoinPrice: 'BitcoinPrice',
    DataUpdate: 'DataUpdate',
    ApiUsage: 'ApiUsage'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "bitcoinPrice" | "dataUpdate" | "apiUsage"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      BitcoinPrice: {
        payload: Prisma.$BitcoinPricePayload<ExtArgs>
        fields: Prisma.BitcoinPriceFieldRefs
        operations: {
          findUnique: {
            args: Prisma.BitcoinPriceFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BitcoinPricePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.BitcoinPriceFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BitcoinPricePayload>
          }
          findFirst: {
            args: Prisma.BitcoinPriceFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BitcoinPricePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.BitcoinPriceFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BitcoinPricePayload>
          }
          findMany: {
            args: Prisma.BitcoinPriceFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BitcoinPricePayload>[]
          }
          create: {
            args: Prisma.BitcoinPriceCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BitcoinPricePayload>
          }
          createMany: {
            args: Prisma.BitcoinPriceCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.BitcoinPriceCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BitcoinPricePayload>[]
          }
          delete: {
            args: Prisma.BitcoinPriceDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BitcoinPricePayload>
          }
          update: {
            args: Prisma.BitcoinPriceUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BitcoinPricePayload>
          }
          deleteMany: {
            args: Prisma.BitcoinPriceDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.BitcoinPriceUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.BitcoinPriceUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BitcoinPricePayload>[]
          }
          upsert: {
            args: Prisma.BitcoinPriceUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BitcoinPricePayload>
          }
          aggregate: {
            args: Prisma.BitcoinPriceAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateBitcoinPrice>
          }
          groupBy: {
            args: Prisma.BitcoinPriceGroupByArgs<ExtArgs>
            result: $Utils.Optional<BitcoinPriceGroupByOutputType>[]
          }
          count: {
            args: Prisma.BitcoinPriceCountArgs<ExtArgs>
            result: $Utils.Optional<BitcoinPriceCountAggregateOutputType> | number
          }
        }
      }
      DataUpdate: {
        payload: Prisma.$DataUpdatePayload<ExtArgs>
        fields: Prisma.DataUpdateFieldRefs
        operations: {
          findUnique: {
            args: Prisma.DataUpdateFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DataUpdatePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.DataUpdateFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DataUpdatePayload>
          }
          findFirst: {
            args: Prisma.DataUpdateFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DataUpdatePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.DataUpdateFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DataUpdatePayload>
          }
          findMany: {
            args: Prisma.DataUpdateFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DataUpdatePayload>[]
          }
          create: {
            args: Prisma.DataUpdateCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DataUpdatePayload>
          }
          createMany: {
            args: Prisma.DataUpdateCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.DataUpdateCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DataUpdatePayload>[]
          }
          delete: {
            args: Prisma.DataUpdateDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DataUpdatePayload>
          }
          update: {
            args: Prisma.DataUpdateUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DataUpdatePayload>
          }
          deleteMany: {
            args: Prisma.DataUpdateDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.DataUpdateUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.DataUpdateUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DataUpdatePayload>[]
          }
          upsert: {
            args: Prisma.DataUpdateUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DataUpdatePayload>
          }
          aggregate: {
            args: Prisma.DataUpdateAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateDataUpdate>
          }
          groupBy: {
            args: Prisma.DataUpdateGroupByArgs<ExtArgs>
            result: $Utils.Optional<DataUpdateGroupByOutputType>[]
          }
          count: {
            args: Prisma.DataUpdateCountArgs<ExtArgs>
            result: $Utils.Optional<DataUpdateCountAggregateOutputType> | number
          }
        }
      }
      ApiUsage: {
        payload: Prisma.$ApiUsagePayload<ExtArgs>
        fields: Prisma.ApiUsageFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ApiUsageFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiUsagePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ApiUsageFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiUsagePayload>
          }
          findFirst: {
            args: Prisma.ApiUsageFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiUsagePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ApiUsageFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiUsagePayload>
          }
          findMany: {
            args: Prisma.ApiUsageFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiUsagePayload>[]
          }
          create: {
            args: Prisma.ApiUsageCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiUsagePayload>
          }
          createMany: {
            args: Prisma.ApiUsageCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ApiUsageCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiUsagePayload>[]
          }
          delete: {
            args: Prisma.ApiUsageDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiUsagePayload>
          }
          update: {
            args: Prisma.ApiUsageUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiUsagePayload>
          }
          deleteMany: {
            args: Prisma.ApiUsageDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ApiUsageUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ApiUsageUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiUsagePayload>[]
          }
          upsert: {
            args: Prisma.ApiUsageUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApiUsagePayload>
          }
          aggregate: {
            args: Prisma.ApiUsageAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateApiUsage>
          }
          groupBy: {
            args: Prisma.ApiUsageGroupByArgs<ExtArgs>
            result: $Utils.Optional<ApiUsageGroupByOutputType>[]
          }
          count: {
            args: Prisma.ApiUsageCountArgs<ExtArgs>
            result: $Utils.Optional<ApiUsageCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    bitcoinPrice?: BitcoinPriceOmit
    dataUpdate?: DataUpdateOmit
    apiUsage?: ApiUsageOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */



  /**
   * Models
   */

  /**
   * Model BitcoinPrice
   */

  export type AggregateBitcoinPrice = {
    _count: BitcoinPriceCountAggregateOutputType | null
    _avg: BitcoinPriceAvgAggregateOutputType | null
    _sum: BitcoinPriceSumAggregateOutputType | null
    _min: BitcoinPriceMinAggregateOutputType | null
    _max: BitcoinPriceMaxAggregateOutputType | null
  }

  export type BitcoinPriceAvgAggregateOutputType = {
    id: number | null
    timestamp: number | null
    open: number | null
    high: number | null
    low: number | null
    close: number | null
    volume: number | null
  }

  export type BitcoinPriceSumAggregateOutputType = {
    id: number | null
    timestamp: bigint | null
    open: number | null
    high: number | null
    low: number | null
    close: number | null
    volume: number | null
  }

  export type BitcoinPriceMinAggregateOutputType = {
    id: number | null
    date: string | null
    timestamp: bigint | null
    open: number | null
    high: number | null
    low: number | null
    close: number | null
    volume: number | null
    source: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type BitcoinPriceMaxAggregateOutputType = {
    id: number | null
    date: string | null
    timestamp: bigint | null
    open: number | null
    high: number | null
    low: number | null
    close: number | null
    volume: number | null
    source: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type BitcoinPriceCountAggregateOutputType = {
    id: number
    date: number
    timestamp: number
    open: number
    high: number
    low: number
    close: number
    volume: number
    source: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type BitcoinPriceAvgAggregateInputType = {
    id?: true
    timestamp?: true
    open?: true
    high?: true
    low?: true
    close?: true
    volume?: true
  }

  export type BitcoinPriceSumAggregateInputType = {
    id?: true
    timestamp?: true
    open?: true
    high?: true
    low?: true
    close?: true
    volume?: true
  }

  export type BitcoinPriceMinAggregateInputType = {
    id?: true
    date?: true
    timestamp?: true
    open?: true
    high?: true
    low?: true
    close?: true
    volume?: true
    source?: true
    createdAt?: true
    updatedAt?: true
  }

  export type BitcoinPriceMaxAggregateInputType = {
    id?: true
    date?: true
    timestamp?: true
    open?: true
    high?: true
    low?: true
    close?: true
    volume?: true
    source?: true
    createdAt?: true
    updatedAt?: true
  }

  export type BitcoinPriceCountAggregateInputType = {
    id?: true
    date?: true
    timestamp?: true
    open?: true
    high?: true
    low?: true
    close?: true
    volume?: true
    source?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type BitcoinPriceAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which BitcoinPrice to aggregate.
     */
    where?: BitcoinPriceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BitcoinPrices to fetch.
     */
    orderBy?: BitcoinPriceOrderByWithRelationInput | BitcoinPriceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: BitcoinPriceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BitcoinPrices from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BitcoinPrices.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned BitcoinPrices
    **/
    _count?: true | BitcoinPriceCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: BitcoinPriceAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: BitcoinPriceSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: BitcoinPriceMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: BitcoinPriceMaxAggregateInputType
  }

  export type GetBitcoinPriceAggregateType<T extends BitcoinPriceAggregateArgs> = {
        [P in keyof T & keyof AggregateBitcoinPrice]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateBitcoinPrice[P]>
      : GetScalarType<T[P], AggregateBitcoinPrice[P]>
  }




  export type BitcoinPriceGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BitcoinPriceWhereInput
    orderBy?: BitcoinPriceOrderByWithAggregationInput | BitcoinPriceOrderByWithAggregationInput[]
    by: BitcoinPriceScalarFieldEnum[] | BitcoinPriceScalarFieldEnum
    having?: BitcoinPriceScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: BitcoinPriceCountAggregateInputType | true
    _avg?: BitcoinPriceAvgAggregateInputType
    _sum?: BitcoinPriceSumAggregateInputType
    _min?: BitcoinPriceMinAggregateInputType
    _max?: BitcoinPriceMaxAggregateInputType
  }

  export type BitcoinPriceGroupByOutputType = {
    id: number
    date: string
    timestamp: bigint
    open: number
    high: number
    low: number
    close: number
    volume: number | null
    source: string
    createdAt: Date
    updatedAt: Date
    _count: BitcoinPriceCountAggregateOutputType | null
    _avg: BitcoinPriceAvgAggregateOutputType | null
    _sum: BitcoinPriceSumAggregateOutputType | null
    _min: BitcoinPriceMinAggregateOutputType | null
    _max: BitcoinPriceMaxAggregateOutputType | null
  }

  type GetBitcoinPriceGroupByPayload<T extends BitcoinPriceGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<BitcoinPriceGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof BitcoinPriceGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], BitcoinPriceGroupByOutputType[P]>
            : GetScalarType<T[P], BitcoinPriceGroupByOutputType[P]>
        }
      >
    >


  export type BitcoinPriceSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    date?: boolean
    timestamp?: boolean
    open?: boolean
    high?: boolean
    low?: boolean
    close?: boolean
    volume?: boolean
    source?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["bitcoinPrice"]>

  export type BitcoinPriceSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    date?: boolean
    timestamp?: boolean
    open?: boolean
    high?: boolean
    low?: boolean
    close?: boolean
    volume?: boolean
    source?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["bitcoinPrice"]>

  export type BitcoinPriceSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    date?: boolean
    timestamp?: boolean
    open?: boolean
    high?: boolean
    low?: boolean
    close?: boolean
    volume?: boolean
    source?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["bitcoinPrice"]>

  export type BitcoinPriceSelectScalar = {
    id?: boolean
    date?: boolean
    timestamp?: boolean
    open?: boolean
    high?: boolean
    low?: boolean
    close?: boolean
    volume?: boolean
    source?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type BitcoinPriceOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "date" | "timestamp" | "open" | "high" | "low" | "close" | "volume" | "source" | "createdAt" | "updatedAt", ExtArgs["result"]["bitcoinPrice"]>

  export type $BitcoinPricePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "BitcoinPrice"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      date: string
      timestamp: bigint
      open: number
      high: number
      low: number
      close: number
      volume: number | null
      source: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["bitcoinPrice"]>
    composites: {}
  }

  type BitcoinPriceGetPayload<S extends boolean | null | undefined | BitcoinPriceDefaultArgs> = $Result.GetResult<Prisma.$BitcoinPricePayload, S>

  type BitcoinPriceCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<BitcoinPriceFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: BitcoinPriceCountAggregateInputType | true
    }

  export interface BitcoinPriceDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['BitcoinPrice'], meta: { name: 'BitcoinPrice' } }
    /**
     * Find zero or one BitcoinPrice that matches the filter.
     * @param {BitcoinPriceFindUniqueArgs} args - Arguments to find a BitcoinPrice
     * @example
     * // Get one BitcoinPrice
     * const bitcoinPrice = await prisma.bitcoinPrice.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends BitcoinPriceFindUniqueArgs>(args: SelectSubset<T, BitcoinPriceFindUniqueArgs<ExtArgs>>): Prisma__BitcoinPriceClient<$Result.GetResult<Prisma.$BitcoinPricePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one BitcoinPrice that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {BitcoinPriceFindUniqueOrThrowArgs} args - Arguments to find a BitcoinPrice
     * @example
     * // Get one BitcoinPrice
     * const bitcoinPrice = await prisma.bitcoinPrice.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends BitcoinPriceFindUniqueOrThrowArgs>(args: SelectSubset<T, BitcoinPriceFindUniqueOrThrowArgs<ExtArgs>>): Prisma__BitcoinPriceClient<$Result.GetResult<Prisma.$BitcoinPricePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first BitcoinPrice that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BitcoinPriceFindFirstArgs} args - Arguments to find a BitcoinPrice
     * @example
     * // Get one BitcoinPrice
     * const bitcoinPrice = await prisma.bitcoinPrice.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends BitcoinPriceFindFirstArgs>(args?: SelectSubset<T, BitcoinPriceFindFirstArgs<ExtArgs>>): Prisma__BitcoinPriceClient<$Result.GetResult<Prisma.$BitcoinPricePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first BitcoinPrice that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BitcoinPriceFindFirstOrThrowArgs} args - Arguments to find a BitcoinPrice
     * @example
     * // Get one BitcoinPrice
     * const bitcoinPrice = await prisma.bitcoinPrice.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends BitcoinPriceFindFirstOrThrowArgs>(args?: SelectSubset<T, BitcoinPriceFindFirstOrThrowArgs<ExtArgs>>): Prisma__BitcoinPriceClient<$Result.GetResult<Prisma.$BitcoinPricePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more BitcoinPrices that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BitcoinPriceFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all BitcoinPrices
     * const bitcoinPrices = await prisma.bitcoinPrice.findMany()
     * 
     * // Get first 10 BitcoinPrices
     * const bitcoinPrices = await prisma.bitcoinPrice.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const bitcoinPriceWithIdOnly = await prisma.bitcoinPrice.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends BitcoinPriceFindManyArgs>(args?: SelectSubset<T, BitcoinPriceFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BitcoinPricePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a BitcoinPrice.
     * @param {BitcoinPriceCreateArgs} args - Arguments to create a BitcoinPrice.
     * @example
     * // Create one BitcoinPrice
     * const BitcoinPrice = await prisma.bitcoinPrice.create({
     *   data: {
     *     // ... data to create a BitcoinPrice
     *   }
     * })
     * 
     */
    create<T extends BitcoinPriceCreateArgs>(args: SelectSubset<T, BitcoinPriceCreateArgs<ExtArgs>>): Prisma__BitcoinPriceClient<$Result.GetResult<Prisma.$BitcoinPricePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many BitcoinPrices.
     * @param {BitcoinPriceCreateManyArgs} args - Arguments to create many BitcoinPrices.
     * @example
     * // Create many BitcoinPrices
     * const bitcoinPrice = await prisma.bitcoinPrice.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends BitcoinPriceCreateManyArgs>(args?: SelectSubset<T, BitcoinPriceCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many BitcoinPrices and returns the data saved in the database.
     * @param {BitcoinPriceCreateManyAndReturnArgs} args - Arguments to create many BitcoinPrices.
     * @example
     * // Create many BitcoinPrices
     * const bitcoinPrice = await prisma.bitcoinPrice.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many BitcoinPrices and only return the `id`
     * const bitcoinPriceWithIdOnly = await prisma.bitcoinPrice.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends BitcoinPriceCreateManyAndReturnArgs>(args?: SelectSubset<T, BitcoinPriceCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BitcoinPricePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a BitcoinPrice.
     * @param {BitcoinPriceDeleteArgs} args - Arguments to delete one BitcoinPrice.
     * @example
     * // Delete one BitcoinPrice
     * const BitcoinPrice = await prisma.bitcoinPrice.delete({
     *   where: {
     *     // ... filter to delete one BitcoinPrice
     *   }
     * })
     * 
     */
    delete<T extends BitcoinPriceDeleteArgs>(args: SelectSubset<T, BitcoinPriceDeleteArgs<ExtArgs>>): Prisma__BitcoinPriceClient<$Result.GetResult<Prisma.$BitcoinPricePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one BitcoinPrice.
     * @param {BitcoinPriceUpdateArgs} args - Arguments to update one BitcoinPrice.
     * @example
     * // Update one BitcoinPrice
     * const bitcoinPrice = await prisma.bitcoinPrice.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends BitcoinPriceUpdateArgs>(args: SelectSubset<T, BitcoinPriceUpdateArgs<ExtArgs>>): Prisma__BitcoinPriceClient<$Result.GetResult<Prisma.$BitcoinPricePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more BitcoinPrices.
     * @param {BitcoinPriceDeleteManyArgs} args - Arguments to filter BitcoinPrices to delete.
     * @example
     * // Delete a few BitcoinPrices
     * const { count } = await prisma.bitcoinPrice.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends BitcoinPriceDeleteManyArgs>(args?: SelectSubset<T, BitcoinPriceDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more BitcoinPrices.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BitcoinPriceUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many BitcoinPrices
     * const bitcoinPrice = await prisma.bitcoinPrice.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends BitcoinPriceUpdateManyArgs>(args: SelectSubset<T, BitcoinPriceUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more BitcoinPrices and returns the data updated in the database.
     * @param {BitcoinPriceUpdateManyAndReturnArgs} args - Arguments to update many BitcoinPrices.
     * @example
     * // Update many BitcoinPrices
     * const bitcoinPrice = await prisma.bitcoinPrice.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more BitcoinPrices and only return the `id`
     * const bitcoinPriceWithIdOnly = await prisma.bitcoinPrice.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends BitcoinPriceUpdateManyAndReturnArgs>(args: SelectSubset<T, BitcoinPriceUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BitcoinPricePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one BitcoinPrice.
     * @param {BitcoinPriceUpsertArgs} args - Arguments to update or create a BitcoinPrice.
     * @example
     * // Update or create a BitcoinPrice
     * const bitcoinPrice = await prisma.bitcoinPrice.upsert({
     *   create: {
     *     // ... data to create a BitcoinPrice
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the BitcoinPrice we want to update
     *   }
     * })
     */
    upsert<T extends BitcoinPriceUpsertArgs>(args: SelectSubset<T, BitcoinPriceUpsertArgs<ExtArgs>>): Prisma__BitcoinPriceClient<$Result.GetResult<Prisma.$BitcoinPricePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of BitcoinPrices.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BitcoinPriceCountArgs} args - Arguments to filter BitcoinPrices to count.
     * @example
     * // Count the number of BitcoinPrices
     * const count = await prisma.bitcoinPrice.count({
     *   where: {
     *     // ... the filter for the BitcoinPrices we want to count
     *   }
     * })
    **/
    count<T extends BitcoinPriceCountArgs>(
      args?: Subset<T, BitcoinPriceCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], BitcoinPriceCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a BitcoinPrice.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BitcoinPriceAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends BitcoinPriceAggregateArgs>(args: Subset<T, BitcoinPriceAggregateArgs>): Prisma.PrismaPromise<GetBitcoinPriceAggregateType<T>>

    /**
     * Group by BitcoinPrice.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BitcoinPriceGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends BitcoinPriceGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: BitcoinPriceGroupByArgs['orderBy'] }
        : { orderBy?: BitcoinPriceGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, BitcoinPriceGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetBitcoinPriceGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the BitcoinPrice model
   */
  readonly fields: BitcoinPriceFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for BitcoinPrice.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__BitcoinPriceClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the BitcoinPrice model
   */
  interface BitcoinPriceFieldRefs {
    readonly id: FieldRef<"BitcoinPrice", 'Int'>
    readonly date: FieldRef<"BitcoinPrice", 'String'>
    readonly timestamp: FieldRef<"BitcoinPrice", 'BigInt'>
    readonly open: FieldRef<"BitcoinPrice", 'Float'>
    readonly high: FieldRef<"BitcoinPrice", 'Float'>
    readonly low: FieldRef<"BitcoinPrice", 'Float'>
    readonly close: FieldRef<"BitcoinPrice", 'Float'>
    readonly volume: FieldRef<"BitcoinPrice", 'Float'>
    readonly source: FieldRef<"BitcoinPrice", 'String'>
    readonly createdAt: FieldRef<"BitcoinPrice", 'DateTime'>
    readonly updatedAt: FieldRef<"BitcoinPrice", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * BitcoinPrice findUnique
   */
  export type BitcoinPriceFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BitcoinPrice
     */
    select?: BitcoinPriceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BitcoinPrice
     */
    omit?: BitcoinPriceOmit<ExtArgs> | null
    /**
     * Filter, which BitcoinPrice to fetch.
     */
    where: BitcoinPriceWhereUniqueInput
  }

  /**
   * BitcoinPrice findUniqueOrThrow
   */
  export type BitcoinPriceFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BitcoinPrice
     */
    select?: BitcoinPriceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BitcoinPrice
     */
    omit?: BitcoinPriceOmit<ExtArgs> | null
    /**
     * Filter, which BitcoinPrice to fetch.
     */
    where: BitcoinPriceWhereUniqueInput
  }

  /**
   * BitcoinPrice findFirst
   */
  export type BitcoinPriceFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BitcoinPrice
     */
    select?: BitcoinPriceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BitcoinPrice
     */
    omit?: BitcoinPriceOmit<ExtArgs> | null
    /**
     * Filter, which BitcoinPrice to fetch.
     */
    where?: BitcoinPriceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BitcoinPrices to fetch.
     */
    orderBy?: BitcoinPriceOrderByWithRelationInput | BitcoinPriceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BitcoinPrices.
     */
    cursor?: BitcoinPriceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BitcoinPrices from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BitcoinPrices.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BitcoinPrices.
     */
    distinct?: BitcoinPriceScalarFieldEnum | BitcoinPriceScalarFieldEnum[]
  }

  /**
   * BitcoinPrice findFirstOrThrow
   */
  export type BitcoinPriceFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BitcoinPrice
     */
    select?: BitcoinPriceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BitcoinPrice
     */
    omit?: BitcoinPriceOmit<ExtArgs> | null
    /**
     * Filter, which BitcoinPrice to fetch.
     */
    where?: BitcoinPriceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BitcoinPrices to fetch.
     */
    orderBy?: BitcoinPriceOrderByWithRelationInput | BitcoinPriceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BitcoinPrices.
     */
    cursor?: BitcoinPriceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BitcoinPrices from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BitcoinPrices.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BitcoinPrices.
     */
    distinct?: BitcoinPriceScalarFieldEnum | BitcoinPriceScalarFieldEnum[]
  }

  /**
   * BitcoinPrice findMany
   */
  export type BitcoinPriceFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BitcoinPrice
     */
    select?: BitcoinPriceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BitcoinPrice
     */
    omit?: BitcoinPriceOmit<ExtArgs> | null
    /**
     * Filter, which BitcoinPrices to fetch.
     */
    where?: BitcoinPriceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BitcoinPrices to fetch.
     */
    orderBy?: BitcoinPriceOrderByWithRelationInput | BitcoinPriceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing BitcoinPrices.
     */
    cursor?: BitcoinPriceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BitcoinPrices from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BitcoinPrices.
     */
    skip?: number
    distinct?: BitcoinPriceScalarFieldEnum | BitcoinPriceScalarFieldEnum[]
  }

  /**
   * BitcoinPrice create
   */
  export type BitcoinPriceCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BitcoinPrice
     */
    select?: BitcoinPriceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BitcoinPrice
     */
    omit?: BitcoinPriceOmit<ExtArgs> | null
    /**
     * The data needed to create a BitcoinPrice.
     */
    data: XOR<BitcoinPriceCreateInput, BitcoinPriceUncheckedCreateInput>
  }

  /**
   * BitcoinPrice createMany
   */
  export type BitcoinPriceCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many BitcoinPrices.
     */
    data: BitcoinPriceCreateManyInput | BitcoinPriceCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * BitcoinPrice createManyAndReturn
   */
  export type BitcoinPriceCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BitcoinPrice
     */
    select?: BitcoinPriceSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the BitcoinPrice
     */
    omit?: BitcoinPriceOmit<ExtArgs> | null
    /**
     * The data used to create many BitcoinPrices.
     */
    data: BitcoinPriceCreateManyInput | BitcoinPriceCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * BitcoinPrice update
   */
  export type BitcoinPriceUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BitcoinPrice
     */
    select?: BitcoinPriceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BitcoinPrice
     */
    omit?: BitcoinPriceOmit<ExtArgs> | null
    /**
     * The data needed to update a BitcoinPrice.
     */
    data: XOR<BitcoinPriceUpdateInput, BitcoinPriceUncheckedUpdateInput>
    /**
     * Choose, which BitcoinPrice to update.
     */
    where: BitcoinPriceWhereUniqueInput
  }

  /**
   * BitcoinPrice updateMany
   */
  export type BitcoinPriceUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update BitcoinPrices.
     */
    data: XOR<BitcoinPriceUpdateManyMutationInput, BitcoinPriceUncheckedUpdateManyInput>
    /**
     * Filter which BitcoinPrices to update
     */
    where?: BitcoinPriceWhereInput
    /**
     * Limit how many BitcoinPrices to update.
     */
    limit?: number
  }

  /**
   * BitcoinPrice updateManyAndReturn
   */
  export type BitcoinPriceUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BitcoinPrice
     */
    select?: BitcoinPriceSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the BitcoinPrice
     */
    omit?: BitcoinPriceOmit<ExtArgs> | null
    /**
     * The data used to update BitcoinPrices.
     */
    data: XOR<BitcoinPriceUpdateManyMutationInput, BitcoinPriceUncheckedUpdateManyInput>
    /**
     * Filter which BitcoinPrices to update
     */
    where?: BitcoinPriceWhereInput
    /**
     * Limit how many BitcoinPrices to update.
     */
    limit?: number
  }

  /**
   * BitcoinPrice upsert
   */
  export type BitcoinPriceUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BitcoinPrice
     */
    select?: BitcoinPriceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BitcoinPrice
     */
    omit?: BitcoinPriceOmit<ExtArgs> | null
    /**
     * The filter to search for the BitcoinPrice to update in case it exists.
     */
    where: BitcoinPriceWhereUniqueInput
    /**
     * In case the BitcoinPrice found by the `where` argument doesn't exist, create a new BitcoinPrice with this data.
     */
    create: XOR<BitcoinPriceCreateInput, BitcoinPriceUncheckedCreateInput>
    /**
     * In case the BitcoinPrice was found with the provided `where` argument, update it with this data.
     */
    update: XOR<BitcoinPriceUpdateInput, BitcoinPriceUncheckedUpdateInput>
  }

  /**
   * BitcoinPrice delete
   */
  export type BitcoinPriceDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BitcoinPrice
     */
    select?: BitcoinPriceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BitcoinPrice
     */
    omit?: BitcoinPriceOmit<ExtArgs> | null
    /**
     * Filter which BitcoinPrice to delete.
     */
    where: BitcoinPriceWhereUniqueInput
  }

  /**
   * BitcoinPrice deleteMany
   */
  export type BitcoinPriceDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which BitcoinPrices to delete
     */
    where?: BitcoinPriceWhereInput
    /**
     * Limit how many BitcoinPrices to delete.
     */
    limit?: number
  }

  /**
   * BitcoinPrice without action
   */
  export type BitcoinPriceDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BitcoinPrice
     */
    select?: BitcoinPriceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BitcoinPrice
     */
    omit?: BitcoinPriceOmit<ExtArgs> | null
  }


  /**
   * Model DataUpdate
   */

  export type AggregateDataUpdate = {
    _count: DataUpdateCountAggregateOutputType | null
    _avg: DataUpdateAvgAggregateOutputType | null
    _sum: DataUpdateSumAggregateOutputType | null
    _min: DataUpdateMinAggregateOutputType | null
    _max: DataUpdateMaxAggregateOutputType | null
  }

  export type DataUpdateAvgAggregateOutputType = {
    id: number | null
    recordsAdded: number | null
    recordsUpdated: number | null
  }

  export type DataUpdateSumAggregateOutputType = {
    id: number | null
    recordsAdded: number | null
    recordsUpdated: number | null
  }

  export type DataUpdateMinAggregateOutputType = {
    id: number | null
    updateDate: string | null
    recordsAdded: number | null
    recordsUpdated: number | null
    source: string | null
    startDate: string | null
    endDate: string | null
    status: string | null
    errorMessage: string | null
    createdAt: Date | null
  }

  export type DataUpdateMaxAggregateOutputType = {
    id: number | null
    updateDate: string | null
    recordsAdded: number | null
    recordsUpdated: number | null
    source: string | null
    startDate: string | null
    endDate: string | null
    status: string | null
    errorMessage: string | null
    createdAt: Date | null
  }

  export type DataUpdateCountAggregateOutputType = {
    id: number
    updateDate: number
    recordsAdded: number
    recordsUpdated: number
    source: number
    startDate: number
    endDate: number
    status: number
    errorMessage: number
    createdAt: number
    _all: number
  }


  export type DataUpdateAvgAggregateInputType = {
    id?: true
    recordsAdded?: true
    recordsUpdated?: true
  }

  export type DataUpdateSumAggregateInputType = {
    id?: true
    recordsAdded?: true
    recordsUpdated?: true
  }

  export type DataUpdateMinAggregateInputType = {
    id?: true
    updateDate?: true
    recordsAdded?: true
    recordsUpdated?: true
    source?: true
    startDate?: true
    endDate?: true
    status?: true
    errorMessage?: true
    createdAt?: true
  }

  export type DataUpdateMaxAggregateInputType = {
    id?: true
    updateDate?: true
    recordsAdded?: true
    recordsUpdated?: true
    source?: true
    startDate?: true
    endDate?: true
    status?: true
    errorMessage?: true
    createdAt?: true
  }

  export type DataUpdateCountAggregateInputType = {
    id?: true
    updateDate?: true
    recordsAdded?: true
    recordsUpdated?: true
    source?: true
    startDate?: true
    endDate?: true
    status?: true
    errorMessage?: true
    createdAt?: true
    _all?: true
  }

  export type DataUpdateAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DataUpdate to aggregate.
     */
    where?: DataUpdateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DataUpdates to fetch.
     */
    orderBy?: DataUpdateOrderByWithRelationInput | DataUpdateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: DataUpdateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DataUpdates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DataUpdates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned DataUpdates
    **/
    _count?: true | DataUpdateCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: DataUpdateAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: DataUpdateSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: DataUpdateMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: DataUpdateMaxAggregateInputType
  }

  export type GetDataUpdateAggregateType<T extends DataUpdateAggregateArgs> = {
        [P in keyof T & keyof AggregateDataUpdate]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateDataUpdate[P]>
      : GetScalarType<T[P], AggregateDataUpdate[P]>
  }




  export type DataUpdateGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DataUpdateWhereInput
    orderBy?: DataUpdateOrderByWithAggregationInput | DataUpdateOrderByWithAggregationInput[]
    by: DataUpdateScalarFieldEnum[] | DataUpdateScalarFieldEnum
    having?: DataUpdateScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: DataUpdateCountAggregateInputType | true
    _avg?: DataUpdateAvgAggregateInputType
    _sum?: DataUpdateSumAggregateInputType
    _min?: DataUpdateMinAggregateInputType
    _max?: DataUpdateMaxAggregateInputType
  }

  export type DataUpdateGroupByOutputType = {
    id: number
    updateDate: string
    recordsAdded: number
    recordsUpdated: number
    source: string
    startDate: string | null
    endDate: string | null
    status: string
    errorMessage: string | null
    createdAt: Date
    _count: DataUpdateCountAggregateOutputType | null
    _avg: DataUpdateAvgAggregateOutputType | null
    _sum: DataUpdateSumAggregateOutputType | null
    _min: DataUpdateMinAggregateOutputType | null
    _max: DataUpdateMaxAggregateOutputType | null
  }

  type GetDataUpdateGroupByPayload<T extends DataUpdateGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<DataUpdateGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof DataUpdateGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], DataUpdateGroupByOutputType[P]>
            : GetScalarType<T[P], DataUpdateGroupByOutputType[P]>
        }
      >
    >


  export type DataUpdateSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    updateDate?: boolean
    recordsAdded?: boolean
    recordsUpdated?: boolean
    source?: boolean
    startDate?: boolean
    endDate?: boolean
    status?: boolean
    errorMessage?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["dataUpdate"]>

  export type DataUpdateSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    updateDate?: boolean
    recordsAdded?: boolean
    recordsUpdated?: boolean
    source?: boolean
    startDate?: boolean
    endDate?: boolean
    status?: boolean
    errorMessage?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["dataUpdate"]>

  export type DataUpdateSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    updateDate?: boolean
    recordsAdded?: boolean
    recordsUpdated?: boolean
    source?: boolean
    startDate?: boolean
    endDate?: boolean
    status?: boolean
    errorMessage?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["dataUpdate"]>

  export type DataUpdateSelectScalar = {
    id?: boolean
    updateDate?: boolean
    recordsAdded?: boolean
    recordsUpdated?: boolean
    source?: boolean
    startDate?: boolean
    endDate?: boolean
    status?: boolean
    errorMessage?: boolean
    createdAt?: boolean
  }

  export type DataUpdateOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "updateDate" | "recordsAdded" | "recordsUpdated" | "source" | "startDate" | "endDate" | "status" | "errorMessage" | "createdAt", ExtArgs["result"]["dataUpdate"]>

  export type $DataUpdatePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "DataUpdate"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      updateDate: string
      recordsAdded: number
      recordsUpdated: number
      source: string
      startDate: string | null
      endDate: string | null
      status: string
      errorMessage: string | null
      createdAt: Date
    }, ExtArgs["result"]["dataUpdate"]>
    composites: {}
  }

  type DataUpdateGetPayload<S extends boolean | null | undefined | DataUpdateDefaultArgs> = $Result.GetResult<Prisma.$DataUpdatePayload, S>

  type DataUpdateCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<DataUpdateFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: DataUpdateCountAggregateInputType | true
    }

  export interface DataUpdateDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['DataUpdate'], meta: { name: 'DataUpdate' } }
    /**
     * Find zero or one DataUpdate that matches the filter.
     * @param {DataUpdateFindUniqueArgs} args - Arguments to find a DataUpdate
     * @example
     * // Get one DataUpdate
     * const dataUpdate = await prisma.dataUpdate.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends DataUpdateFindUniqueArgs>(args: SelectSubset<T, DataUpdateFindUniqueArgs<ExtArgs>>): Prisma__DataUpdateClient<$Result.GetResult<Prisma.$DataUpdatePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one DataUpdate that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {DataUpdateFindUniqueOrThrowArgs} args - Arguments to find a DataUpdate
     * @example
     * // Get one DataUpdate
     * const dataUpdate = await prisma.dataUpdate.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends DataUpdateFindUniqueOrThrowArgs>(args: SelectSubset<T, DataUpdateFindUniqueOrThrowArgs<ExtArgs>>): Prisma__DataUpdateClient<$Result.GetResult<Prisma.$DataUpdatePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first DataUpdate that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DataUpdateFindFirstArgs} args - Arguments to find a DataUpdate
     * @example
     * // Get one DataUpdate
     * const dataUpdate = await prisma.dataUpdate.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends DataUpdateFindFirstArgs>(args?: SelectSubset<T, DataUpdateFindFirstArgs<ExtArgs>>): Prisma__DataUpdateClient<$Result.GetResult<Prisma.$DataUpdatePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first DataUpdate that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DataUpdateFindFirstOrThrowArgs} args - Arguments to find a DataUpdate
     * @example
     * // Get one DataUpdate
     * const dataUpdate = await prisma.dataUpdate.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends DataUpdateFindFirstOrThrowArgs>(args?: SelectSubset<T, DataUpdateFindFirstOrThrowArgs<ExtArgs>>): Prisma__DataUpdateClient<$Result.GetResult<Prisma.$DataUpdatePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more DataUpdates that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DataUpdateFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all DataUpdates
     * const dataUpdates = await prisma.dataUpdate.findMany()
     * 
     * // Get first 10 DataUpdates
     * const dataUpdates = await prisma.dataUpdate.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const dataUpdateWithIdOnly = await prisma.dataUpdate.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends DataUpdateFindManyArgs>(args?: SelectSubset<T, DataUpdateFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DataUpdatePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a DataUpdate.
     * @param {DataUpdateCreateArgs} args - Arguments to create a DataUpdate.
     * @example
     * // Create one DataUpdate
     * const DataUpdate = await prisma.dataUpdate.create({
     *   data: {
     *     // ... data to create a DataUpdate
     *   }
     * })
     * 
     */
    create<T extends DataUpdateCreateArgs>(args: SelectSubset<T, DataUpdateCreateArgs<ExtArgs>>): Prisma__DataUpdateClient<$Result.GetResult<Prisma.$DataUpdatePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many DataUpdates.
     * @param {DataUpdateCreateManyArgs} args - Arguments to create many DataUpdates.
     * @example
     * // Create many DataUpdates
     * const dataUpdate = await prisma.dataUpdate.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends DataUpdateCreateManyArgs>(args?: SelectSubset<T, DataUpdateCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many DataUpdates and returns the data saved in the database.
     * @param {DataUpdateCreateManyAndReturnArgs} args - Arguments to create many DataUpdates.
     * @example
     * // Create many DataUpdates
     * const dataUpdate = await prisma.dataUpdate.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many DataUpdates and only return the `id`
     * const dataUpdateWithIdOnly = await prisma.dataUpdate.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends DataUpdateCreateManyAndReturnArgs>(args?: SelectSubset<T, DataUpdateCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DataUpdatePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a DataUpdate.
     * @param {DataUpdateDeleteArgs} args - Arguments to delete one DataUpdate.
     * @example
     * // Delete one DataUpdate
     * const DataUpdate = await prisma.dataUpdate.delete({
     *   where: {
     *     // ... filter to delete one DataUpdate
     *   }
     * })
     * 
     */
    delete<T extends DataUpdateDeleteArgs>(args: SelectSubset<T, DataUpdateDeleteArgs<ExtArgs>>): Prisma__DataUpdateClient<$Result.GetResult<Prisma.$DataUpdatePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one DataUpdate.
     * @param {DataUpdateUpdateArgs} args - Arguments to update one DataUpdate.
     * @example
     * // Update one DataUpdate
     * const dataUpdate = await prisma.dataUpdate.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends DataUpdateUpdateArgs>(args: SelectSubset<T, DataUpdateUpdateArgs<ExtArgs>>): Prisma__DataUpdateClient<$Result.GetResult<Prisma.$DataUpdatePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more DataUpdates.
     * @param {DataUpdateDeleteManyArgs} args - Arguments to filter DataUpdates to delete.
     * @example
     * // Delete a few DataUpdates
     * const { count } = await prisma.dataUpdate.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends DataUpdateDeleteManyArgs>(args?: SelectSubset<T, DataUpdateDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more DataUpdates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DataUpdateUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many DataUpdates
     * const dataUpdate = await prisma.dataUpdate.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends DataUpdateUpdateManyArgs>(args: SelectSubset<T, DataUpdateUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more DataUpdates and returns the data updated in the database.
     * @param {DataUpdateUpdateManyAndReturnArgs} args - Arguments to update many DataUpdates.
     * @example
     * // Update many DataUpdates
     * const dataUpdate = await prisma.dataUpdate.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more DataUpdates and only return the `id`
     * const dataUpdateWithIdOnly = await prisma.dataUpdate.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends DataUpdateUpdateManyAndReturnArgs>(args: SelectSubset<T, DataUpdateUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DataUpdatePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one DataUpdate.
     * @param {DataUpdateUpsertArgs} args - Arguments to update or create a DataUpdate.
     * @example
     * // Update or create a DataUpdate
     * const dataUpdate = await prisma.dataUpdate.upsert({
     *   create: {
     *     // ... data to create a DataUpdate
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the DataUpdate we want to update
     *   }
     * })
     */
    upsert<T extends DataUpdateUpsertArgs>(args: SelectSubset<T, DataUpdateUpsertArgs<ExtArgs>>): Prisma__DataUpdateClient<$Result.GetResult<Prisma.$DataUpdatePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of DataUpdates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DataUpdateCountArgs} args - Arguments to filter DataUpdates to count.
     * @example
     * // Count the number of DataUpdates
     * const count = await prisma.dataUpdate.count({
     *   where: {
     *     // ... the filter for the DataUpdates we want to count
     *   }
     * })
    **/
    count<T extends DataUpdateCountArgs>(
      args?: Subset<T, DataUpdateCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], DataUpdateCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a DataUpdate.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DataUpdateAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends DataUpdateAggregateArgs>(args: Subset<T, DataUpdateAggregateArgs>): Prisma.PrismaPromise<GetDataUpdateAggregateType<T>>

    /**
     * Group by DataUpdate.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DataUpdateGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends DataUpdateGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: DataUpdateGroupByArgs['orderBy'] }
        : { orderBy?: DataUpdateGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, DataUpdateGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetDataUpdateGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the DataUpdate model
   */
  readonly fields: DataUpdateFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for DataUpdate.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__DataUpdateClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the DataUpdate model
   */
  interface DataUpdateFieldRefs {
    readonly id: FieldRef<"DataUpdate", 'Int'>
    readonly updateDate: FieldRef<"DataUpdate", 'String'>
    readonly recordsAdded: FieldRef<"DataUpdate", 'Int'>
    readonly recordsUpdated: FieldRef<"DataUpdate", 'Int'>
    readonly source: FieldRef<"DataUpdate", 'String'>
    readonly startDate: FieldRef<"DataUpdate", 'String'>
    readonly endDate: FieldRef<"DataUpdate", 'String'>
    readonly status: FieldRef<"DataUpdate", 'String'>
    readonly errorMessage: FieldRef<"DataUpdate", 'String'>
    readonly createdAt: FieldRef<"DataUpdate", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * DataUpdate findUnique
   */
  export type DataUpdateFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DataUpdate
     */
    select?: DataUpdateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DataUpdate
     */
    omit?: DataUpdateOmit<ExtArgs> | null
    /**
     * Filter, which DataUpdate to fetch.
     */
    where: DataUpdateWhereUniqueInput
  }

  /**
   * DataUpdate findUniqueOrThrow
   */
  export type DataUpdateFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DataUpdate
     */
    select?: DataUpdateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DataUpdate
     */
    omit?: DataUpdateOmit<ExtArgs> | null
    /**
     * Filter, which DataUpdate to fetch.
     */
    where: DataUpdateWhereUniqueInput
  }

  /**
   * DataUpdate findFirst
   */
  export type DataUpdateFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DataUpdate
     */
    select?: DataUpdateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DataUpdate
     */
    omit?: DataUpdateOmit<ExtArgs> | null
    /**
     * Filter, which DataUpdate to fetch.
     */
    where?: DataUpdateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DataUpdates to fetch.
     */
    orderBy?: DataUpdateOrderByWithRelationInput | DataUpdateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DataUpdates.
     */
    cursor?: DataUpdateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DataUpdates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DataUpdates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DataUpdates.
     */
    distinct?: DataUpdateScalarFieldEnum | DataUpdateScalarFieldEnum[]
  }

  /**
   * DataUpdate findFirstOrThrow
   */
  export type DataUpdateFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DataUpdate
     */
    select?: DataUpdateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DataUpdate
     */
    omit?: DataUpdateOmit<ExtArgs> | null
    /**
     * Filter, which DataUpdate to fetch.
     */
    where?: DataUpdateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DataUpdates to fetch.
     */
    orderBy?: DataUpdateOrderByWithRelationInput | DataUpdateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DataUpdates.
     */
    cursor?: DataUpdateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DataUpdates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DataUpdates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DataUpdates.
     */
    distinct?: DataUpdateScalarFieldEnum | DataUpdateScalarFieldEnum[]
  }

  /**
   * DataUpdate findMany
   */
  export type DataUpdateFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DataUpdate
     */
    select?: DataUpdateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DataUpdate
     */
    omit?: DataUpdateOmit<ExtArgs> | null
    /**
     * Filter, which DataUpdates to fetch.
     */
    where?: DataUpdateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DataUpdates to fetch.
     */
    orderBy?: DataUpdateOrderByWithRelationInput | DataUpdateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing DataUpdates.
     */
    cursor?: DataUpdateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DataUpdates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DataUpdates.
     */
    skip?: number
    distinct?: DataUpdateScalarFieldEnum | DataUpdateScalarFieldEnum[]
  }

  /**
   * DataUpdate create
   */
  export type DataUpdateCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DataUpdate
     */
    select?: DataUpdateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DataUpdate
     */
    omit?: DataUpdateOmit<ExtArgs> | null
    /**
     * The data needed to create a DataUpdate.
     */
    data: XOR<DataUpdateCreateInput, DataUpdateUncheckedCreateInput>
  }

  /**
   * DataUpdate createMany
   */
  export type DataUpdateCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many DataUpdates.
     */
    data: DataUpdateCreateManyInput | DataUpdateCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * DataUpdate createManyAndReturn
   */
  export type DataUpdateCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DataUpdate
     */
    select?: DataUpdateSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the DataUpdate
     */
    omit?: DataUpdateOmit<ExtArgs> | null
    /**
     * The data used to create many DataUpdates.
     */
    data: DataUpdateCreateManyInput | DataUpdateCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * DataUpdate update
   */
  export type DataUpdateUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DataUpdate
     */
    select?: DataUpdateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DataUpdate
     */
    omit?: DataUpdateOmit<ExtArgs> | null
    /**
     * The data needed to update a DataUpdate.
     */
    data: XOR<DataUpdateUpdateInput, DataUpdateUncheckedUpdateInput>
    /**
     * Choose, which DataUpdate to update.
     */
    where: DataUpdateWhereUniqueInput
  }

  /**
   * DataUpdate updateMany
   */
  export type DataUpdateUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update DataUpdates.
     */
    data: XOR<DataUpdateUpdateManyMutationInput, DataUpdateUncheckedUpdateManyInput>
    /**
     * Filter which DataUpdates to update
     */
    where?: DataUpdateWhereInput
    /**
     * Limit how many DataUpdates to update.
     */
    limit?: number
  }

  /**
   * DataUpdate updateManyAndReturn
   */
  export type DataUpdateUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DataUpdate
     */
    select?: DataUpdateSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the DataUpdate
     */
    omit?: DataUpdateOmit<ExtArgs> | null
    /**
     * The data used to update DataUpdates.
     */
    data: XOR<DataUpdateUpdateManyMutationInput, DataUpdateUncheckedUpdateManyInput>
    /**
     * Filter which DataUpdates to update
     */
    where?: DataUpdateWhereInput
    /**
     * Limit how many DataUpdates to update.
     */
    limit?: number
  }

  /**
   * DataUpdate upsert
   */
  export type DataUpdateUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DataUpdate
     */
    select?: DataUpdateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DataUpdate
     */
    omit?: DataUpdateOmit<ExtArgs> | null
    /**
     * The filter to search for the DataUpdate to update in case it exists.
     */
    where: DataUpdateWhereUniqueInput
    /**
     * In case the DataUpdate found by the `where` argument doesn't exist, create a new DataUpdate with this data.
     */
    create: XOR<DataUpdateCreateInput, DataUpdateUncheckedCreateInput>
    /**
     * In case the DataUpdate was found with the provided `where` argument, update it with this data.
     */
    update: XOR<DataUpdateUpdateInput, DataUpdateUncheckedUpdateInput>
  }

  /**
   * DataUpdate delete
   */
  export type DataUpdateDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DataUpdate
     */
    select?: DataUpdateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DataUpdate
     */
    omit?: DataUpdateOmit<ExtArgs> | null
    /**
     * Filter which DataUpdate to delete.
     */
    where: DataUpdateWhereUniqueInput
  }

  /**
   * DataUpdate deleteMany
   */
  export type DataUpdateDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DataUpdates to delete
     */
    where?: DataUpdateWhereInput
    /**
     * Limit how many DataUpdates to delete.
     */
    limit?: number
  }

  /**
   * DataUpdate without action
   */
  export type DataUpdateDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DataUpdate
     */
    select?: DataUpdateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DataUpdate
     */
    omit?: DataUpdateOmit<ExtArgs> | null
  }


  /**
   * Model ApiUsage
   */

  export type AggregateApiUsage = {
    _count: ApiUsageCountAggregateOutputType | null
    _avg: ApiUsageAvgAggregateOutputType | null
    _sum: ApiUsageSumAggregateOutputType | null
    _min: ApiUsageMinAggregateOutputType | null
    _max: ApiUsageMaxAggregateOutputType | null
  }

  export type ApiUsageAvgAggregateOutputType = {
    id: number | null
    requestCount: number | null
    successCount: number | null
    errorCount: number | null
  }

  export type ApiUsageSumAggregateOutputType = {
    id: number | null
    requestCount: number | null
    successCount: number | null
    errorCount: number | null
  }

  export type ApiUsageMinAggregateOutputType = {
    id: number | null
    apiName: string | null
    endpoint: string | null
    requestCount: number | null
    lastRequestAt: Date | null
    successCount: number | null
    errorCount: number | null
    rateLimitResetAt: Date | null
    createdAt: Date | null
  }

  export type ApiUsageMaxAggregateOutputType = {
    id: number | null
    apiName: string | null
    endpoint: string | null
    requestCount: number | null
    lastRequestAt: Date | null
    successCount: number | null
    errorCount: number | null
    rateLimitResetAt: Date | null
    createdAt: Date | null
  }

  export type ApiUsageCountAggregateOutputType = {
    id: number
    apiName: number
    endpoint: number
    requestCount: number
    lastRequestAt: number
    successCount: number
    errorCount: number
    rateLimitResetAt: number
    createdAt: number
    _all: number
  }


  export type ApiUsageAvgAggregateInputType = {
    id?: true
    requestCount?: true
    successCount?: true
    errorCount?: true
  }

  export type ApiUsageSumAggregateInputType = {
    id?: true
    requestCount?: true
    successCount?: true
    errorCount?: true
  }

  export type ApiUsageMinAggregateInputType = {
    id?: true
    apiName?: true
    endpoint?: true
    requestCount?: true
    lastRequestAt?: true
    successCount?: true
    errorCount?: true
    rateLimitResetAt?: true
    createdAt?: true
  }

  export type ApiUsageMaxAggregateInputType = {
    id?: true
    apiName?: true
    endpoint?: true
    requestCount?: true
    lastRequestAt?: true
    successCount?: true
    errorCount?: true
    rateLimitResetAt?: true
    createdAt?: true
  }

  export type ApiUsageCountAggregateInputType = {
    id?: true
    apiName?: true
    endpoint?: true
    requestCount?: true
    lastRequestAt?: true
    successCount?: true
    errorCount?: true
    rateLimitResetAt?: true
    createdAt?: true
    _all?: true
  }

  export type ApiUsageAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ApiUsage to aggregate.
     */
    where?: ApiUsageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ApiUsages to fetch.
     */
    orderBy?: ApiUsageOrderByWithRelationInput | ApiUsageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ApiUsageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ApiUsages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ApiUsages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ApiUsages
    **/
    _count?: true | ApiUsageCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ApiUsageAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ApiUsageSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ApiUsageMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ApiUsageMaxAggregateInputType
  }

  export type GetApiUsageAggregateType<T extends ApiUsageAggregateArgs> = {
        [P in keyof T & keyof AggregateApiUsage]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateApiUsage[P]>
      : GetScalarType<T[P], AggregateApiUsage[P]>
  }




  export type ApiUsageGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ApiUsageWhereInput
    orderBy?: ApiUsageOrderByWithAggregationInput | ApiUsageOrderByWithAggregationInput[]
    by: ApiUsageScalarFieldEnum[] | ApiUsageScalarFieldEnum
    having?: ApiUsageScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ApiUsageCountAggregateInputType | true
    _avg?: ApiUsageAvgAggregateInputType
    _sum?: ApiUsageSumAggregateInputType
    _min?: ApiUsageMinAggregateInputType
    _max?: ApiUsageMaxAggregateInputType
  }

  export type ApiUsageGroupByOutputType = {
    id: number
    apiName: string
    endpoint: string
    requestCount: number
    lastRequestAt: Date
    successCount: number
    errorCount: number
    rateLimitResetAt: Date | null
    createdAt: Date
    _count: ApiUsageCountAggregateOutputType | null
    _avg: ApiUsageAvgAggregateOutputType | null
    _sum: ApiUsageSumAggregateOutputType | null
    _min: ApiUsageMinAggregateOutputType | null
    _max: ApiUsageMaxAggregateOutputType | null
  }

  type GetApiUsageGroupByPayload<T extends ApiUsageGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ApiUsageGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ApiUsageGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ApiUsageGroupByOutputType[P]>
            : GetScalarType<T[P], ApiUsageGroupByOutputType[P]>
        }
      >
    >


  export type ApiUsageSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    apiName?: boolean
    endpoint?: boolean
    requestCount?: boolean
    lastRequestAt?: boolean
    successCount?: boolean
    errorCount?: boolean
    rateLimitResetAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["apiUsage"]>

  export type ApiUsageSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    apiName?: boolean
    endpoint?: boolean
    requestCount?: boolean
    lastRequestAt?: boolean
    successCount?: boolean
    errorCount?: boolean
    rateLimitResetAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["apiUsage"]>

  export type ApiUsageSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    apiName?: boolean
    endpoint?: boolean
    requestCount?: boolean
    lastRequestAt?: boolean
    successCount?: boolean
    errorCount?: boolean
    rateLimitResetAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["apiUsage"]>

  export type ApiUsageSelectScalar = {
    id?: boolean
    apiName?: boolean
    endpoint?: boolean
    requestCount?: boolean
    lastRequestAt?: boolean
    successCount?: boolean
    errorCount?: boolean
    rateLimitResetAt?: boolean
    createdAt?: boolean
  }

  export type ApiUsageOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "apiName" | "endpoint" | "requestCount" | "lastRequestAt" | "successCount" | "errorCount" | "rateLimitResetAt" | "createdAt", ExtArgs["result"]["apiUsage"]>

  export type $ApiUsagePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ApiUsage"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      apiName: string
      endpoint: string
      requestCount: number
      lastRequestAt: Date
      successCount: number
      errorCount: number
      rateLimitResetAt: Date | null
      createdAt: Date
    }, ExtArgs["result"]["apiUsage"]>
    composites: {}
  }

  type ApiUsageGetPayload<S extends boolean | null | undefined | ApiUsageDefaultArgs> = $Result.GetResult<Prisma.$ApiUsagePayload, S>

  type ApiUsageCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ApiUsageFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ApiUsageCountAggregateInputType | true
    }

  export interface ApiUsageDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ApiUsage'], meta: { name: 'ApiUsage' } }
    /**
     * Find zero or one ApiUsage that matches the filter.
     * @param {ApiUsageFindUniqueArgs} args - Arguments to find a ApiUsage
     * @example
     * // Get one ApiUsage
     * const apiUsage = await prisma.apiUsage.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ApiUsageFindUniqueArgs>(args: SelectSubset<T, ApiUsageFindUniqueArgs<ExtArgs>>): Prisma__ApiUsageClient<$Result.GetResult<Prisma.$ApiUsagePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ApiUsage that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ApiUsageFindUniqueOrThrowArgs} args - Arguments to find a ApiUsage
     * @example
     * // Get one ApiUsage
     * const apiUsage = await prisma.apiUsage.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ApiUsageFindUniqueOrThrowArgs>(args: SelectSubset<T, ApiUsageFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ApiUsageClient<$Result.GetResult<Prisma.$ApiUsagePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ApiUsage that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApiUsageFindFirstArgs} args - Arguments to find a ApiUsage
     * @example
     * // Get one ApiUsage
     * const apiUsage = await prisma.apiUsage.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ApiUsageFindFirstArgs>(args?: SelectSubset<T, ApiUsageFindFirstArgs<ExtArgs>>): Prisma__ApiUsageClient<$Result.GetResult<Prisma.$ApiUsagePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ApiUsage that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApiUsageFindFirstOrThrowArgs} args - Arguments to find a ApiUsage
     * @example
     * // Get one ApiUsage
     * const apiUsage = await prisma.apiUsage.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ApiUsageFindFirstOrThrowArgs>(args?: SelectSubset<T, ApiUsageFindFirstOrThrowArgs<ExtArgs>>): Prisma__ApiUsageClient<$Result.GetResult<Prisma.$ApiUsagePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ApiUsages that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApiUsageFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ApiUsages
     * const apiUsages = await prisma.apiUsage.findMany()
     * 
     * // Get first 10 ApiUsages
     * const apiUsages = await prisma.apiUsage.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const apiUsageWithIdOnly = await prisma.apiUsage.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ApiUsageFindManyArgs>(args?: SelectSubset<T, ApiUsageFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApiUsagePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ApiUsage.
     * @param {ApiUsageCreateArgs} args - Arguments to create a ApiUsage.
     * @example
     * // Create one ApiUsage
     * const ApiUsage = await prisma.apiUsage.create({
     *   data: {
     *     // ... data to create a ApiUsage
     *   }
     * })
     * 
     */
    create<T extends ApiUsageCreateArgs>(args: SelectSubset<T, ApiUsageCreateArgs<ExtArgs>>): Prisma__ApiUsageClient<$Result.GetResult<Prisma.$ApiUsagePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ApiUsages.
     * @param {ApiUsageCreateManyArgs} args - Arguments to create many ApiUsages.
     * @example
     * // Create many ApiUsages
     * const apiUsage = await prisma.apiUsage.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ApiUsageCreateManyArgs>(args?: SelectSubset<T, ApiUsageCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ApiUsages and returns the data saved in the database.
     * @param {ApiUsageCreateManyAndReturnArgs} args - Arguments to create many ApiUsages.
     * @example
     * // Create many ApiUsages
     * const apiUsage = await prisma.apiUsage.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ApiUsages and only return the `id`
     * const apiUsageWithIdOnly = await prisma.apiUsage.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ApiUsageCreateManyAndReturnArgs>(args?: SelectSubset<T, ApiUsageCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApiUsagePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ApiUsage.
     * @param {ApiUsageDeleteArgs} args - Arguments to delete one ApiUsage.
     * @example
     * // Delete one ApiUsage
     * const ApiUsage = await prisma.apiUsage.delete({
     *   where: {
     *     // ... filter to delete one ApiUsage
     *   }
     * })
     * 
     */
    delete<T extends ApiUsageDeleteArgs>(args: SelectSubset<T, ApiUsageDeleteArgs<ExtArgs>>): Prisma__ApiUsageClient<$Result.GetResult<Prisma.$ApiUsagePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ApiUsage.
     * @param {ApiUsageUpdateArgs} args - Arguments to update one ApiUsage.
     * @example
     * // Update one ApiUsage
     * const apiUsage = await prisma.apiUsage.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ApiUsageUpdateArgs>(args: SelectSubset<T, ApiUsageUpdateArgs<ExtArgs>>): Prisma__ApiUsageClient<$Result.GetResult<Prisma.$ApiUsagePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ApiUsages.
     * @param {ApiUsageDeleteManyArgs} args - Arguments to filter ApiUsages to delete.
     * @example
     * // Delete a few ApiUsages
     * const { count } = await prisma.apiUsage.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ApiUsageDeleteManyArgs>(args?: SelectSubset<T, ApiUsageDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ApiUsages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApiUsageUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ApiUsages
     * const apiUsage = await prisma.apiUsage.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ApiUsageUpdateManyArgs>(args: SelectSubset<T, ApiUsageUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ApiUsages and returns the data updated in the database.
     * @param {ApiUsageUpdateManyAndReturnArgs} args - Arguments to update many ApiUsages.
     * @example
     * // Update many ApiUsages
     * const apiUsage = await prisma.apiUsage.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ApiUsages and only return the `id`
     * const apiUsageWithIdOnly = await prisma.apiUsage.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ApiUsageUpdateManyAndReturnArgs>(args: SelectSubset<T, ApiUsageUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApiUsagePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ApiUsage.
     * @param {ApiUsageUpsertArgs} args - Arguments to update or create a ApiUsage.
     * @example
     * // Update or create a ApiUsage
     * const apiUsage = await prisma.apiUsage.upsert({
     *   create: {
     *     // ... data to create a ApiUsage
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ApiUsage we want to update
     *   }
     * })
     */
    upsert<T extends ApiUsageUpsertArgs>(args: SelectSubset<T, ApiUsageUpsertArgs<ExtArgs>>): Prisma__ApiUsageClient<$Result.GetResult<Prisma.$ApiUsagePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ApiUsages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApiUsageCountArgs} args - Arguments to filter ApiUsages to count.
     * @example
     * // Count the number of ApiUsages
     * const count = await prisma.apiUsage.count({
     *   where: {
     *     // ... the filter for the ApiUsages we want to count
     *   }
     * })
    **/
    count<T extends ApiUsageCountArgs>(
      args?: Subset<T, ApiUsageCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ApiUsageCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ApiUsage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApiUsageAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ApiUsageAggregateArgs>(args: Subset<T, ApiUsageAggregateArgs>): Prisma.PrismaPromise<GetApiUsageAggregateType<T>>

    /**
     * Group by ApiUsage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApiUsageGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ApiUsageGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ApiUsageGroupByArgs['orderBy'] }
        : { orderBy?: ApiUsageGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ApiUsageGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetApiUsageGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ApiUsage model
   */
  readonly fields: ApiUsageFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ApiUsage.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ApiUsageClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ApiUsage model
   */
  interface ApiUsageFieldRefs {
    readonly id: FieldRef<"ApiUsage", 'Int'>
    readonly apiName: FieldRef<"ApiUsage", 'String'>
    readonly endpoint: FieldRef<"ApiUsage", 'String'>
    readonly requestCount: FieldRef<"ApiUsage", 'Int'>
    readonly lastRequestAt: FieldRef<"ApiUsage", 'DateTime'>
    readonly successCount: FieldRef<"ApiUsage", 'Int'>
    readonly errorCount: FieldRef<"ApiUsage", 'Int'>
    readonly rateLimitResetAt: FieldRef<"ApiUsage", 'DateTime'>
    readonly createdAt: FieldRef<"ApiUsage", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ApiUsage findUnique
   */
  export type ApiUsageFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiUsage
     */
    select?: ApiUsageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiUsage
     */
    omit?: ApiUsageOmit<ExtArgs> | null
    /**
     * Filter, which ApiUsage to fetch.
     */
    where: ApiUsageWhereUniqueInput
  }

  /**
   * ApiUsage findUniqueOrThrow
   */
  export type ApiUsageFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiUsage
     */
    select?: ApiUsageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiUsage
     */
    omit?: ApiUsageOmit<ExtArgs> | null
    /**
     * Filter, which ApiUsage to fetch.
     */
    where: ApiUsageWhereUniqueInput
  }

  /**
   * ApiUsage findFirst
   */
  export type ApiUsageFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiUsage
     */
    select?: ApiUsageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiUsage
     */
    omit?: ApiUsageOmit<ExtArgs> | null
    /**
     * Filter, which ApiUsage to fetch.
     */
    where?: ApiUsageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ApiUsages to fetch.
     */
    orderBy?: ApiUsageOrderByWithRelationInput | ApiUsageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ApiUsages.
     */
    cursor?: ApiUsageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ApiUsages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ApiUsages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ApiUsages.
     */
    distinct?: ApiUsageScalarFieldEnum | ApiUsageScalarFieldEnum[]
  }

  /**
   * ApiUsage findFirstOrThrow
   */
  export type ApiUsageFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiUsage
     */
    select?: ApiUsageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiUsage
     */
    omit?: ApiUsageOmit<ExtArgs> | null
    /**
     * Filter, which ApiUsage to fetch.
     */
    where?: ApiUsageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ApiUsages to fetch.
     */
    orderBy?: ApiUsageOrderByWithRelationInput | ApiUsageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ApiUsages.
     */
    cursor?: ApiUsageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ApiUsages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ApiUsages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ApiUsages.
     */
    distinct?: ApiUsageScalarFieldEnum | ApiUsageScalarFieldEnum[]
  }

  /**
   * ApiUsage findMany
   */
  export type ApiUsageFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiUsage
     */
    select?: ApiUsageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiUsage
     */
    omit?: ApiUsageOmit<ExtArgs> | null
    /**
     * Filter, which ApiUsages to fetch.
     */
    where?: ApiUsageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ApiUsages to fetch.
     */
    orderBy?: ApiUsageOrderByWithRelationInput | ApiUsageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ApiUsages.
     */
    cursor?: ApiUsageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ApiUsages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ApiUsages.
     */
    skip?: number
    distinct?: ApiUsageScalarFieldEnum | ApiUsageScalarFieldEnum[]
  }

  /**
   * ApiUsage create
   */
  export type ApiUsageCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiUsage
     */
    select?: ApiUsageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiUsage
     */
    omit?: ApiUsageOmit<ExtArgs> | null
    /**
     * The data needed to create a ApiUsage.
     */
    data: XOR<ApiUsageCreateInput, ApiUsageUncheckedCreateInput>
  }

  /**
   * ApiUsage createMany
   */
  export type ApiUsageCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ApiUsages.
     */
    data: ApiUsageCreateManyInput | ApiUsageCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ApiUsage createManyAndReturn
   */
  export type ApiUsageCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiUsage
     */
    select?: ApiUsageSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ApiUsage
     */
    omit?: ApiUsageOmit<ExtArgs> | null
    /**
     * The data used to create many ApiUsages.
     */
    data: ApiUsageCreateManyInput | ApiUsageCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ApiUsage update
   */
  export type ApiUsageUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiUsage
     */
    select?: ApiUsageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiUsage
     */
    omit?: ApiUsageOmit<ExtArgs> | null
    /**
     * The data needed to update a ApiUsage.
     */
    data: XOR<ApiUsageUpdateInput, ApiUsageUncheckedUpdateInput>
    /**
     * Choose, which ApiUsage to update.
     */
    where: ApiUsageWhereUniqueInput
  }

  /**
   * ApiUsage updateMany
   */
  export type ApiUsageUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ApiUsages.
     */
    data: XOR<ApiUsageUpdateManyMutationInput, ApiUsageUncheckedUpdateManyInput>
    /**
     * Filter which ApiUsages to update
     */
    where?: ApiUsageWhereInput
    /**
     * Limit how many ApiUsages to update.
     */
    limit?: number
  }

  /**
   * ApiUsage updateManyAndReturn
   */
  export type ApiUsageUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiUsage
     */
    select?: ApiUsageSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ApiUsage
     */
    omit?: ApiUsageOmit<ExtArgs> | null
    /**
     * The data used to update ApiUsages.
     */
    data: XOR<ApiUsageUpdateManyMutationInput, ApiUsageUncheckedUpdateManyInput>
    /**
     * Filter which ApiUsages to update
     */
    where?: ApiUsageWhereInput
    /**
     * Limit how many ApiUsages to update.
     */
    limit?: number
  }

  /**
   * ApiUsage upsert
   */
  export type ApiUsageUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiUsage
     */
    select?: ApiUsageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiUsage
     */
    omit?: ApiUsageOmit<ExtArgs> | null
    /**
     * The filter to search for the ApiUsage to update in case it exists.
     */
    where: ApiUsageWhereUniqueInput
    /**
     * In case the ApiUsage found by the `where` argument doesn't exist, create a new ApiUsage with this data.
     */
    create: XOR<ApiUsageCreateInput, ApiUsageUncheckedCreateInput>
    /**
     * In case the ApiUsage was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ApiUsageUpdateInput, ApiUsageUncheckedUpdateInput>
  }

  /**
   * ApiUsage delete
   */
  export type ApiUsageDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiUsage
     */
    select?: ApiUsageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiUsage
     */
    omit?: ApiUsageOmit<ExtArgs> | null
    /**
     * Filter which ApiUsage to delete.
     */
    where: ApiUsageWhereUniqueInput
  }

  /**
   * ApiUsage deleteMany
   */
  export type ApiUsageDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ApiUsages to delete
     */
    where?: ApiUsageWhereInput
    /**
     * Limit how many ApiUsages to delete.
     */
    limit?: number
  }

  /**
   * ApiUsage without action
   */
  export type ApiUsageDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApiUsage
     */
    select?: ApiUsageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApiUsage
     */
    omit?: ApiUsageOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const BitcoinPriceScalarFieldEnum: {
    id: 'id',
    date: 'date',
    timestamp: 'timestamp',
    open: 'open',
    high: 'high',
    low: 'low',
    close: 'close',
    volume: 'volume',
    source: 'source',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type BitcoinPriceScalarFieldEnum = (typeof BitcoinPriceScalarFieldEnum)[keyof typeof BitcoinPriceScalarFieldEnum]


  export const DataUpdateScalarFieldEnum: {
    id: 'id',
    updateDate: 'updateDate',
    recordsAdded: 'recordsAdded',
    recordsUpdated: 'recordsUpdated',
    source: 'source',
    startDate: 'startDate',
    endDate: 'endDate',
    status: 'status',
    errorMessage: 'errorMessage',
    createdAt: 'createdAt'
  };

  export type DataUpdateScalarFieldEnum = (typeof DataUpdateScalarFieldEnum)[keyof typeof DataUpdateScalarFieldEnum]


  export const ApiUsageScalarFieldEnum: {
    id: 'id',
    apiName: 'apiName',
    endpoint: 'endpoint',
    requestCount: 'requestCount',
    lastRequestAt: 'lastRequestAt',
    successCount: 'successCount',
    errorCount: 'errorCount',
    rateLimitResetAt: 'rateLimitResetAt',
    createdAt: 'createdAt'
  };

  export type ApiUsageScalarFieldEnum = (typeof ApiUsageScalarFieldEnum)[keyof typeof ApiUsageScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'BigInt'
   */
  export type BigIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BigInt'>
    


  /**
   * Reference to a field of type 'BigInt[]'
   */
  export type ListBigIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BigInt[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    
  /**
   * Deep Input Types
   */


  export type BitcoinPriceWhereInput = {
    AND?: BitcoinPriceWhereInput | BitcoinPriceWhereInput[]
    OR?: BitcoinPriceWhereInput[]
    NOT?: BitcoinPriceWhereInput | BitcoinPriceWhereInput[]
    id?: IntFilter<"BitcoinPrice"> | number
    date?: StringFilter<"BitcoinPrice"> | string
    timestamp?: BigIntFilter<"BitcoinPrice"> | bigint | number
    open?: FloatFilter<"BitcoinPrice"> | number
    high?: FloatFilter<"BitcoinPrice"> | number
    low?: FloatFilter<"BitcoinPrice"> | number
    close?: FloatFilter<"BitcoinPrice"> | number
    volume?: FloatNullableFilter<"BitcoinPrice"> | number | null
    source?: StringFilter<"BitcoinPrice"> | string
    createdAt?: DateTimeFilter<"BitcoinPrice"> | Date | string
    updatedAt?: DateTimeFilter<"BitcoinPrice"> | Date | string
  }

  export type BitcoinPriceOrderByWithRelationInput = {
    id?: SortOrder
    date?: SortOrder
    timestamp?: SortOrder
    open?: SortOrder
    high?: SortOrder
    low?: SortOrder
    close?: SortOrder
    volume?: SortOrderInput | SortOrder
    source?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BitcoinPriceWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    date?: string
    AND?: BitcoinPriceWhereInput | BitcoinPriceWhereInput[]
    OR?: BitcoinPriceWhereInput[]
    NOT?: BitcoinPriceWhereInput | BitcoinPriceWhereInput[]
    timestamp?: BigIntFilter<"BitcoinPrice"> | bigint | number
    open?: FloatFilter<"BitcoinPrice"> | number
    high?: FloatFilter<"BitcoinPrice"> | number
    low?: FloatFilter<"BitcoinPrice"> | number
    close?: FloatFilter<"BitcoinPrice"> | number
    volume?: FloatNullableFilter<"BitcoinPrice"> | number | null
    source?: StringFilter<"BitcoinPrice"> | string
    createdAt?: DateTimeFilter<"BitcoinPrice"> | Date | string
    updatedAt?: DateTimeFilter<"BitcoinPrice"> | Date | string
  }, "id" | "date">

  export type BitcoinPriceOrderByWithAggregationInput = {
    id?: SortOrder
    date?: SortOrder
    timestamp?: SortOrder
    open?: SortOrder
    high?: SortOrder
    low?: SortOrder
    close?: SortOrder
    volume?: SortOrderInput | SortOrder
    source?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: BitcoinPriceCountOrderByAggregateInput
    _avg?: BitcoinPriceAvgOrderByAggregateInput
    _max?: BitcoinPriceMaxOrderByAggregateInput
    _min?: BitcoinPriceMinOrderByAggregateInput
    _sum?: BitcoinPriceSumOrderByAggregateInput
  }

  export type BitcoinPriceScalarWhereWithAggregatesInput = {
    AND?: BitcoinPriceScalarWhereWithAggregatesInput | BitcoinPriceScalarWhereWithAggregatesInput[]
    OR?: BitcoinPriceScalarWhereWithAggregatesInput[]
    NOT?: BitcoinPriceScalarWhereWithAggregatesInput | BitcoinPriceScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"BitcoinPrice"> | number
    date?: StringWithAggregatesFilter<"BitcoinPrice"> | string
    timestamp?: BigIntWithAggregatesFilter<"BitcoinPrice"> | bigint | number
    open?: FloatWithAggregatesFilter<"BitcoinPrice"> | number
    high?: FloatWithAggregatesFilter<"BitcoinPrice"> | number
    low?: FloatWithAggregatesFilter<"BitcoinPrice"> | number
    close?: FloatWithAggregatesFilter<"BitcoinPrice"> | number
    volume?: FloatNullableWithAggregatesFilter<"BitcoinPrice"> | number | null
    source?: StringWithAggregatesFilter<"BitcoinPrice"> | string
    createdAt?: DateTimeWithAggregatesFilter<"BitcoinPrice"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"BitcoinPrice"> | Date | string
  }

  export type DataUpdateWhereInput = {
    AND?: DataUpdateWhereInput | DataUpdateWhereInput[]
    OR?: DataUpdateWhereInput[]
    NOT?: DataUpdateWhereInput | DataUpdateWhereInput[]
    id?: IntFilter<"DataUpdate"> | number
    updateDate?: StringFilter<"DataUpdate"> | string
    recordsAdded?: IntFilter<"DataUpdate"> | number
    recordsUpdated?: IntFilter<"DataUpdate"> | number
    source?: StringFilter<"DataUpdate"> | string
    startDate?: StringNullableFilter<"DataUpdate"> | string | null
    endDate?: StringNullableFilter<"DataUpdate"> | string | null
    status?: StringFilter<"DataUpdate"> | string
    errorMessage?: StringNullableFilter<"DataUpdate"> | string | null
    createdAt?: DateTimeFilter<"DataUpdate"> | Date | string
  }

  export type DataUpdateOrderByWithRelationInput = {
    id?: SortOrder
    updateDate?: SortOrder
    recordsAdded?: SortOrder
    recordsUpdated?: SortOrder
    source?: SortOrder
    startDate?: SortOrderInput | SortOrder
    endDate?: SortOrderInput | SortOrder
    status?: SortOrder
    errorMessage?: SortOrderInput | SortOrder
    createdAt?: SortOrder
  }

  export type DataUpdateWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: DataUpdateWhereInput | DataUpdateWhereInput[]
    OR?: DataUpdateWhereInput[]
    NOT?: DataUpdateWhereInput | DataUpdateWhereInput[]
    updateDate?: StringFilter<"DataUpdate"> | string
    recordsAdded?: IntFilter<"DataUpdate"> | number
    recordsUpdated?: IntFilter<"DataUpdate"> | number
    source?: StringFilter<"DataUpdate"> | string
    startDate?: StringNullableFilter<"DataUpdate"> | string | null
    endDate?: StringNullableFilter<"DataUpdate"> | string | null
    status?: StringFilter<"DataUpdate"> | string
    errorMessage?: StringNullableFilter<"DataUpdate"> | string | null
    createdAt?: DateTimeFilter<"DataUpdate"> | Date | string
  }, "id">

  export type DataUpdateOrderByWithAggregationInput = {
    id?: SortOrder
    updateDate?: SortOrder
    recordsAdded?: SortOrder
    recordsUpdated?: SortOrder
    source?: SortOrder
    startDate?: SortOrderInput | SortOrder
    endDate?: SortOrderInput | SortOrder
    status?: SortOrder
    errorMessage?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: DataUpdateCountOrderByAggregateInput
    _avg?: DataUpdateAvgOrderByAggregateInput
    _max?: DataUpdateMaxOrderByAggregateInput
    _min?: DataUpdateMinOrderByAggregateInput
    _sum?: DataUpdateSumOrderByAggregateInput
  }

  export type DataUpdateScalarWhereWithAggregatesInput = {
    AND?: DataUpdateScalarWhereWithAggregatesInput | DataUpdateScalarWhereWithAggregatesInput[]
    OR?: DataUpdateScalarWhereWithAggregatesInput[]
    NOT?: DataUpdateScalarWhereWithAggregatesInput | DataUpdateScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"DataUpdate"> | number
    updateDate?: StringWithAggregatesFilter<"DataUpdate"> | string
    recordsAdded?: IntWithAggregatesFilter<"DataUpdate"> | number
    recordsUpdated?: IntWithAggregatesFilter<"DataUpdate"> | number
    source?: StringWithAggregatesFilter<"DataUpdate"> | string
    startDate?: StringNullableWithAggregatesFilter<"DataUpdate"> | string | null
    endDate?: StringNullableWithAggregatesFilter<"DataUpdate"> | string | null
    status?: StringWithAggregatesFilter<"DataUpdate"> | string
    errorMessage?: StringNullableWithAggregatesFilter<"DataUpdate"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"DataUpdate"> | Date | string
  }

  export type ApiUsageWhereInput = {
    AND?: ApiUsageWhereInput | ApiUsageWhereInput[]
    OR?: ApiUsageWhereInput[]
    NOT?: ApiUsageWhereInput | ApiUsageWhereInput[]
    id?: IntFilter<"ApiUsage"> | number
    apiName?: StringFilter<"ApiUsage"> | string
    endpoint?: StringFilter<"ApiUsage"> | string
    requestCount?: IntFilter<"ApiUsage"> | number
    lastRequestAt?: DateTimeFilter<"ApiUsage"> | Date | string
    successCount?: IntFilter<"ApiUsage"> | number
    errorCount?: IntFilter<"ApiUsage"> | number
    rateLimitResetAt?: DateTimeNullableFilter<"ApiUsage"> | Date | string | null
    createdAt?: DateTimeFilter<"ApiUsage"> | Date | string
  }

  export type ApiUsageOrderByWithRelationInput = {
    id?: SortOrder
    apiName?: SortOrder
    endpoint?: SortOrder
    requestCount?: SortOrder
    lastRequestAt?: SortOrder
    successCount?: SortOrder
    errorCount?: SortOrder
    rateLimitResetAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
  }

  export type ApiUsageWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: ApiUsageWhereInput | ApiUsageWhereInput[]
    OR?: ApiUsageWhereInput[]
    NOT?: ApiUsageWhereInput | ApiUsageWhereInput[]
    apiName?: StringFilter<"ApiUsage"> | string
    endpoint?: StringFilter<"ApiUsage"> | string
    requestCount?: IntFilter<"ApiUsage"> | number
    lastRequestAt?: DateTimeFilter<"ApiUsage"> | Date | string
    successCount?: IntFilter<"ApiUsage"> | number
    errorCount?: IntFilter<"ApiUsage"> | number
    rateLimitResetAt?: DateTimeNullableFilter<"ApiUsage"> | Date | string | null
    createdAt?: DateTimeFilter<"ApiUsage"> | Date | string
  }, "id">

  export type ApiUsageOrderByWithAggregationInput = {
    id?: SortOrder
    apiName?: SortOrder
    endpoint?: SortOrder
    requestCount?: SortOrder
    lastRequestAt?: SortOrder
    successCount?: SortOrder
    errorCount?: SortOrder
    rateLimitResetAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: ApiUsageCountOrderByAggregateInput
    _avg?: ApiUsageAvgOrderByAggregateInput
    _max?: ApiUsageMaxOrderByAggregateInput
    _min?: ApiUsageMinOrderByAggregateInput
    _sum?: ApiUsageSumOrderByAggregateInput
  }

  export type ApiUsageScalarWhereWithAggregatesInput = {
    AND?: ApiUsageScalarWhereWithAggregatesInput | ApiUsageScalarWhereWithAggregatesInput[]
    OR?: ApiUsageScalarWhereWithAggregatesInput[]
    NOT?: ApiUsageScalarWhereWithAggregatesInput | ApiUsageScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"ApiUsage"> | number
    apiName?: StringWithAggregatesFilter<"ApiUsage"> | string
    endpoint?: StringWithAggregatesFilter<"ApiUsage"> | string
    requestCount?: IntWithAggregatesFilter<"ApiUsage"> | number
    lastRequestAt?: DateTimeWithAggregatesFilter<"ApiUsage"> | Date | string
    successCount?: IntWithAggregatesFilter<"ApiUsage"> | number
    errorCount?: IntWithAggregatesFilter<"ApiUsage"> | number
    rateLimitResetAt?: DateTimeNullableWithAggregatesFilter<"ApiUsage"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"ApiUsage"> | Date | string
  }

  export type BitcoinPriceCreateInput = {
    date: string
    timestamp: bigint | number
    open: number
    high: number
    low: number
    close: number
    volume?: number | null
    source?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type BitcoinPriceUncheckedCreateInput = {
    id?: number
    date: string
    timestamp: bigint | number
    open: number
    high: number
    low: number
    close: number
    volume?: number | null
    source?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type BitcoinPriceUpdateInput = {
    date?: StringFieldUpdateOperationsInput | string
    timestamp?: BigIntFieldUpdateOperationsInput | bigint | number
    open?: FloatFieldUpdateOperationsInput | number
    high?: FloatFieldUpdateOperationsInput | number
    low?: FloatFieldUpdateOperationsInput | number
    close?: FloatFieldUpdateOperationsInput | number
    volume?: NullableFloatFieldUpdateOperationsInput | number | null
    source?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BitcoinPriceUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    date?: StringFieldUpdateOperationsInput | string
    timestamp?: BigIntFieldUpdateOperationsInput | bigint | number
    open?: FloatFieldUpdateOperationsInput | number
    high?: FloatFieldUpdateOperationsInput | number
    low?: FloatFieldUpdateOperationsInput | number
    close?: FloatFieldUpdateOperationsInput | number
    volume?: NullableFloatFieldUpdateOperationsInput | number | null
    source?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BitcoinPriceCreateManyInput = {
    id?: number
    date: string
    timestamp: bigint | number
    open: number
    high: number
    low: number
    close: number
    volume?: number | null
    source?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type BitcoinPriceUpdateManyMutationInput = {
    date?: StringFieldUpdateOperationsInput | string
    timestamp?: BigIntFieldUpdateOperationsInput | bigint | number
    open?: FloatFieldUpdateOperationsInput | number
    high?: FloatFieldUpdateOperationsInput | number
    low?: FloatFieldUpdateOperationsInput | number
    close?: FloatFieldUpdateOperationsInput | number
    volume?: NullableFloatFieldUpdateOperationsInput | number | null
    source?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BitcoinPriceUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    date?: StringFieldUpdateOperationsInput | string
    timestamp?: BigIntFieldUpdateOperationsInput | bigint | number
    open?: FloatFieldUpdateOperationsInput | number
    high?: FloatFieldUpdateOperationsInput | number
    low?: FloatFieldUpdateOperationsInput | number
    close?: FloatFieldUpdateOperationsInput | number
    volume?: NullableFloatFieldUpdateOperationsInput | number | null
    source?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DataUpdateCreateInput = {
    updateDate: string
    recordsAdded?: number
    recordsUpdated?: number
    source: string
    startDate?: string | null
    endDate?: string | null
    status?: string
    errorMessage?: string | null
    createdAt?: Date | string
  }

  export type DataUpdateUncheckedCreateInput = {
    id?: number
    updateDate: string
    recordsAdded?: number
    recordsUpdated?: number
    source: string
    startDate?: string | null
    endDate?: string | null
    status?: string
    errorMessage?: string | null
    createdAt?: Date | string
  }

  export type DataUpdateUpdateInput = {
    updateDate?: StringFieldUpdateOperationsInput | string
    recordsAdded?: IntFieldUpdateOperationsInput | number
    recordsUpdated?: IntFieldUpdateOperationsInput | number
    source?: StringFieldUpdateOperationsInput | string
    startDate?: NullableStringFieldUpdateOperationsInput | string | null
    endDate?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DataUpdateUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    updateDate?: StringFieldUpdateOperationsInput | string
    recordsAdded?: IntFieldUpdateOperationsInput | number
    recordsUpdated?: IntFieldUpdateOperationsInput | number
    source?: StringFieldUpdateOperationsInput | string
    startDate?: NullableStringFieldUpdateOperationsInput | string | null
    endDate?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DataUpdateCreateManyInput = {
    id?: number
    updateDate: string
    recordsAdded?: number
    recordsUpdated?: number
    source: string
    startDate?: string | null
    endDate?: string | null
    status?: string
    errorMessage?: string | null
    createdAt?: Date | string
  }

  export type DataUpdateUpdateManyMutationInput = {
    updateDate?: StringFieldUpdateOperationsInput | string
    recordsAdded?: IntFieldUpdateOperationsInput | number
    recordsUpdated?: IntFieldUpdateOperationsInput | number
    source?: StringFieldUpdateOperationsInput | string
    startDate?: NullableStringFieldUpdateOperationsInput | string | null
    endDate?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DataUpdateUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    updateDate?: StringFieldUpdateOperationsInput | string
    recordsAdded?: IntFieldUpdateOperationsInput | number
    recordsUpdated?: IntFieldUpdateOperationsInput | number
    source?: StringFieldUpdateOperationsInput | string
    startDate?: NullableStringFieldUpdateOperationsInput | string | null
    endDate?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApiUsageCreateInput = {
    apiName: string
    endpoint: string
    requestCount?: number
    lastRequestAt?: Date | string
    successCount?: number
    errorCount?: number
    rateLimitResetAt?: Date | string | null
    createdAt?: Date | string
  }

  export type ApiUsageUncheckedCreateInput = {
    id?: number
    apiName: string
    endpoint: string
    requestCount?: number
    lastRequestAt?: Date | string
    successCount?: number
    errorCount?: number
    rateLimitResetAt?: Date | string | null
    createdAt?: Date | string
  }

  export type ApiUsageUpdateInput = {
    apiName?: StringFieldUpdateOperationsInput | string
    endpoint?: StringFieldUpdateOperationsInput | string
    requestCount?: IntFieldUpdateOperationsInput | number
    lastRequestAt?: DateTimeFieldUpdateOperationsInput | Date | string
    successCount?: IntFieldUpdateOperationsInput | number
    errorCount?: IntFieldUpdateOperationsInput | number
    rateLimitResetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApiUsageUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    apiName?: StringFieldUpdateOperationsInput | string
    endpoint?: StringFieldUpdateOperationsInput | string
    requestCount?: IntFieldUpdateOperationsInput | number
    lastRequestAt?: DateTimeFieldUpdateOperationsInput | Date | string
    successCount?: IntFieldUpdateOperationsInput | number
    errorCount?: IntFieldUpdateOperationsInput | number
    rateLimitResetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApiUsageCreateManyInput = {
    id?: number
    apiName: string
    endpoint: string
    requestCount?: number
    lastRequestAt?: Date | string
    successCount?: number
    errorCount?: number
    rateLimitResetAt?: Date | string | null
    createdAt?: Date | string
  }

  export type ApiUsageUpdateManyMutationInput = {
    apiName?: StringFieldUpdateOperationsInput | string
    endpoint?: StringFieldUpdateOperationsInput | string
    requestCount?: IntFieldUpdateOperationsInput | number
    lastRequestAt?: DateTimeFieldUpdateOperationsInput | Date | string
    successCount?: IntFieldUpdateOperationsInput | number
    errorCount?: IntFieldUpdateOperationsInput | number
    rateLimitResetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApiUsageUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    apiName?: StringFieldUpdateOperationsInput | string
    endpoint?: StringFieldUpdateOperationsInput | string
    requestCount?: IntFieldUpdateOperationsInput | number
    lastRequestAt?: DateTimeFieldUpdateOperationsInput | Date | string
    successCount?: IntFieldUpdateOperationsInput | number
    errorCount?: IntFieldUpdateOperationsInput | number
    rateLimitResetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type BigIntFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntFilter<$PrismaModel> | bigint | number
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type BitcoinPriceCountOrderByAggregateInput = {
    id?: SortOrder
    date?: SortOrder
    timestamp?: SortOrder
    open?: SortOrder
    high?: SortOrder
    low?: SortOrder
    close?: SortOrder
    volume?: SortOrder
    source?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BitcoinPriceAvgOrderByAggregateInput = {
    id?: SortOrder
    timestamp?: SortOrder
    open?: SortOrder
    high?: SortOrder
    low?: SortOrder
    close?: SortOrder
    volume?: SortOrder
  }

  export type BitcoinPriceMaxOrderByAggregateInput = {
    id?: SortOrder
    date?: SortOrder
    timestamp?: SortOrder
    open?: SortOrder
    high?: SortOrder
    low?: SortOrder
    close?: SortOrder
    volume?: SortOrder
    source?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BitcoinPriceMinOrderByAggregateInput = {
    id?: SortOrder
    date?: SortOrder
    timestamp?: SortOrder
    open?: SortOrder
    high?: SortOrder
    low?: SortOrder
    close?: SortOrder
    volume?: SortOrder
    source?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BitcoinPriceSumOrderByAggregateInput = {
    id?: SortOrder
    timestamp?: SortOrder
    open?: SortOrder
    high?: SortOrder
    low?: SortOrder
    close?: SortOrder
    volume?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type BigIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntWithAggregatesFilter<$PrismaModel> | bigint | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedBigIntFilter<$PrismaModel>
    _min?: NestedBigIntFilter<$PrismaModel>
    _max?: NestedBigIntFilter<$PrismaModel>
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DataUpdateCountOrderByAggregateInput = {
    id?: SortOrder
    updateDate?: SortOrder
    recordsAdded?: SortOrder
    recordsUpdated?: SortOrder
    source?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    status?: SortOrder
    errorMessage?: SortOrder
    createdAt?: SortOrder
  }

  export type DataUpdateAvgOrderByAggregateInput = {
    id?: SortOrder
    recordsAdded?: SortOrder
    recordsUpdated?: SortOrder
  }

  export type DataUpdateMaxOrderByAggregateInput = {
    id?: SortOrder
    updateDate?: SortOrder
    recordsAdded?: SortOrder
    recordsUpdated?: SortOrder
    source?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    status?: SortOrder
    errorMessage?: SortOrder
    createdAt?: SortOrder
  }

  export type DataUpdateMinOrderByAggregateInput = {
    id?: SortOrder
    updateDate?: SortOrder
    recordsAdded?: SortOrder
    recordsUpdated?: SortOrder
    source?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    status?: SortOrder
    errorMessage?: SortOrder
    createdAt?: SortOrder
  }

  export type DataUpdateSumOrderByAggregateInput = {
    id?: SortOrder
    recordsAdded?: SortOrder
    recordsUpdated?: SortOrder
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type ApiUsageCountOrderByAggregateInput = {
    id?: SortOrder
    apiName?: SortOrder
    endpoint?: SortOrder
    requestCount?: SortOrder
    lastRequestAt?: SortOrder
    successCount?: SortOrder
    errorCount?: SortOrder
    rateLimitResetAt?: SortOrder
    createdAt?: SortOrder
  }

  export type ApiUsageAvgOrderByAggregateInput = {
    id?: SortOrder
    requestCount?: SortOrder
    successCount?: SortOrder
    errorCount?: SortOrder
  }

  export type ApiUsageMaxOrderByAggregateInput = {
    id?: SortOrder
    apiName?: SortOrder
    endpoint?: SortOrder
    requestCount?: SortOrder
    lastRequestAt?: SortOrder
    successCount?: SortOrder
    errorCount?: SortOrder
    rateLimitResetAt?: SortOrder
    createdAt?: SortOrder
  }

  export type ApiUsageMinOrderByAggregateInput = {
    id?: SortOrder
    apiName?: SortOrder
    endpoint?: SortOrder
    requestCount?: SortOrder
    lastRequestAt?: SortOrder
    successCount?: SortOrder
    errorCount?: SortOrder
    rateLimitResetAt?: SortOrder
    createdAt?: SortOrder
  }

  export type ApiUsageSumOrderByAggregateInput = {
    id?: SortOrder
    requestCount?: SortOrder
    successCount?: SortOrder
    errorCount?: SortOrder
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type BigIntFieldUpdateOperationsInput = {
    set?: bigint | number
    increment?: bigint | number
    decrement?: bigint | number
    multiply?: bigint | number
    divide?: bigint | number
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedBigIntFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntFilter<$PrismaModel> | bigint | number
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedBigIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntWithAggregatesFilter<$PrismaModel> | bigint | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedBigIntFilter<$PrismaModel>
    _min?: NestedBigIntFilter<$PrismaModel>
    _max?: NestedBigIntFilter<$PrismaModel>
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}