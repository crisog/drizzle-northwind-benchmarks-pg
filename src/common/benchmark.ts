import { run, bench, group } from "mitata";
import { eq, ilike, placeholder } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { drizzle as drzl } from "drizzle-orm/postgres-js";
import { alias } from "drizzle-orm/pg-core";
import pkg from "pg";
import postgres from "postgres";
import dotenv from "dotenv";
import * as Prisma from "@prisma/client";

import {
  employees,
  customers,
  suppliers,
  products,
  orders,
  details,
} from "@/drizzle/schema";
import {
  customerIds,
  employeeIds,
  orderIds,
  productIds,
  customerSearches,
  productSearches,
  supplierIds,
} from "./meta";
import { createDockerDBs, ports, deleteDockerDBs, DockerDBs } from "@/utils";

dotenv.config();

const DB_HOST = process.env.DB_HOST ?? "localhost";
const DB_NAME = process.env.DB_NAME ?? "postgres";
const DB_USER = process.env.DB_USER ?? "postgres";
const DB_PASSWORD = process.env.DB_PASSWORD ?? "postgres";
const DB_PORT = process.env.DB_PORT;

console.log(DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT);
const port = Number(DB_PORT || ports.drizzle);
console.log(port);

const dockersDbs = await createDockerDBs(ports);

// const { Pool } = pkg;
// pg connect
const pg = new pkg.Pool({
  host: DB_HOST,
  port: Number(DB_PORT || ports.pg),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
});

// pgPrepared connect
const pgPrepared = new pkg.Pool({
  host: DB_HOST,
  port: Number(DB_PORT || ports.pgPrepared),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
});

const pgjs = postgres({
  host: DB_HOST,
  port: Number(DB_PORT || ports.postgresjs),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
});

// drizzle connect
const drizzlePool = postgres(
  process.env.DATABASE_URL ??
    `postgres://postgres:postgres@localhost:${ports.drizzle}/postgres`
);
const drizzle = drzl(drizzlePool);

// drizzlePrepared  connect
const drizzlePreparedPool = postgres(
  process.env.DATABASE_URL ??
    `postgres://postgres:postgres@localhost:${ports.drizzlePrepared}/postgres`
);
// await drizzlePreparedPool.connect();
const drizzlePrepared = drzl(drizzlePreparedPool);

// prisma connect
const prisma = new Prisma.PrismaClient();

group("select * from customer", () => {
  bench("pg", async () => {
    await pg.query('select * from "customers"');
  });

  const query = {
    name: "Customers-getAll",
    text: 'select * from "customers"',
  };
  bench("pg:p", async () => {
    await pgPrepared.query(query);
  });

  bench("postgresjs", async () => {
    await pgjs`select * from "customers"`;
  });

  bench("drizzle", async () => {
    await drizzle.select().from(customers);
  });

  const prepared = drizzlePrepared
    .select()
    .from(customers)
    .prepare("Customers-getAll-D");

  bench("drizzle:p", async () => {
    await prepared.execute();
  });

  bench("prisma", async () => {
    await prisma.customer.findMany();
  });
});

//
group("select * from customer where id = ?", () => {
  bench("pg", async () => {
    for (const id of customerIds) {
      await pg.query('select * from "customers" where "customers"."id" = $1', [
        id,
      ]);
    }
  });
  const query = {
    name: "Customers-getInfo",
    text: 'select * from "customers" where "customers"."id" = $1',
  };

  bench("pg:p", async () => {
    for (const id of customerIds) {
      await pgPrepared.query(query, [id]);
    }
  });

  bench("postgresjs", async () => {
    for (const id of customerIds) {
      await pgjs`select * from "customers" where "customers"."id" = ${id}`;
    }
  });

  bench("drizzle", async () => {
    for (const id of customerIds) {
      await drizzle.select().from(customers).where(eq(customers.id, id));
    }
  });
  const prepared = drizzlePrepared
    .select()
    .from(customers)
    .where(eq(customers.id, placeholder("userId")))
    .prepare("Customers-getInfo-D");

  bench("drizzle:p", async () => {
    for (const id of customerIds) {
      await prepared.execute({ userId: id });
    }
  });

  bench("prisma", async () => {
    for (const id of customerIds) {
      await prisma.customer.findUnique({
        where: {
          id,
        },
      });
    }
  });
});

//
group("select * from customer where company_name ilike ?", () => {
  bench("pg", async () => {
    for (const it of customerSearches) {
      await pg.query(
        'select * from "customers" where "customers"."company_name" ilike $1',
        [`%${it}%`]
      );
    }
  });

  const query = {
    name: "Customers-search",
    text: 'select * from "customers" where "customers"."company_name" ilike $1',
  };
  bench("pg:p", async () => {
    for (const it of customerSearches) {
      await pgPrepared.query(query, [`%${it}%`]);
    }
  });

  bench("postgresjs", async () => {
    for (const id of customerIds) {
      await pgjs`select * from "customers" where "customers"."company_name" ilike ${id}`;
    }
  });

  bench("drizzle", async () => {
    for (const it of customerSearches) {
      await drizzle
        .select()
        .from(customers)
        .where(ilike(customers.companyName, `%${it}%`));
    }
  });

  const prepared = drizzlePrepared
    .select()
    .from(customers)
    .where(sql`${customers.companyName} ilike ${placeholder("name")}`)
    .prepare("Customers-search-D");

  bench("drizzle:p", async () => {
    for (const it of customerSearches) {
      await prepared.execute({ name: `%${it}%` });
    }
  });

  bench("prisma", async () => {
    for (const it of customerSearches) {
      await prisma.customer.findMany({
        where: {
          companyName: {
            contains: it,
            mode: "insensitive",
          },
        },
      });
    }
  });
});

group('"SELECT * FROM employee"', () => {
  bench("pg", async () => {
    await pg.query('select * from "employees"');
  });

  const query = {
    name: "Employees-getAll",
    text: 'select * from "employees"',
  };

  bench("pg:p", async () => {
    await pgPrepared.query(query);
  });

  bench("drizzle", async () => {
    await drizzle.select().from(employees);
  });

  const prepared = drizzlePrepared
    .select()
    .from(employees)
    .prepare("Employees-getAll-D");

  bench("drizzle:p", async () => {
    await prepared.execute();
  });

  bench("prisma", async () => {
    await prisma.employee.findMany();
  });
});

//
group("select * from employee where id = ? left join reportee", () => {
  bench("pg", async () => {
    for (const id of employeeIds) {
      await pg.query(
        `select "e1".*, "e2"."last_name" as "reports_lname", "e2"."first_name" as "reports_fname"
              from "employees" as "e1" left join "employees" as "e2" on "e2"."id" = "e1"."recipient_id" where "e1"."id" = $1`,
        [id]
      );
    }
  });
  const query = {
    name: "Employees-getInfo",
    text: `select "e1".*, "e2"."last_name" as "reports_lname", "e2"."first_name" as "reports_fname"
    from "employees" as "e1" left join "employees" as "e2" on "e2"."id" = "e1"."recipient_id" where "e1"."id" = $1`,
  };

  bench("pg:p", async () => {
    for await (const id of employeeIds) {
      await pgPrepared.query(query, [id]);
    }
  });

  bench("drizzle", async () => {
    const e2 = alias(employees, "recipient");

    for (const id of employeeIds) {
      await drizzle
        .select()
        .from(employees)
        .leftJoin(e2, eq(e2.id, employees.recipientId))
        .where(eq(employees.id, id));
    }
  });

  const e2 = alias(employees, "recipient");
  const prepared = drizzlePrepared
    .select()
    .from(employees)
    .leftJoin(e2, eq(e2.id, employees.recipientId))
    .where(eq(employees.id, placeholder("employeeId")))
    .prepare("Employees-getInfo-D");

  bench("drizzle:p", async () => {
    for (const id of employeeIds) {
      await prepared.execute({ employeeId: id });
    }
  });

  bench("prisma", async () => {
    for (const id of employeeIds) {
      await prisma.employee.findUnique({
        where: {
          id,
        },
        include: {
          recipient: true,
        },
      });
    }
  });
});

//
group("SELECT * FROM supplier", () => {
  bench("pg", async () => {
    await pg.query('select * from "suppliers"');
  });

  const query = {
    name: "Suppliers-getAll",
    text: 'select * from "suppliers"',
  };
  bench("pg:p", async () => {
    await pgPrepared.query(query);
  });

  bench("drizzle", async () => {
    await drizzle.select().from(suppliers);
  });

  const prepared = drizzlePrepared
    .select()
    .from(suppliers)
    .prepare("Suppliers-getAll-D");

  bench("drizzle:p", async () => {
    await prepared.execute();
  });

  bench("prisma", async () => {
    await prisma.supplier.findMany();
  });
});

//
group("select * from supplier where id = ?", () => {
  bench("pg", async () => {
    for (const id of supplierIds) {
      await pg.query('select * from "suppliers" where "suppliers"."id" = $1', [
        id,
      ]);
    }
  });

  const query = {
    name: "Suppliers-getInfo",
    text: 'select * from "suppliers" where "suppliers"."id" = $1',
  };
  bench("pg:p", async () => {
    for (const id of supplierIds) {
      await pgPrepared.query(query, [id]);
    }
  });

  bench("drizzle", async () => {
    for (const id of supplierIds) {
      await drizzle.select().from(suppliers).where(eq(suppliers.id, id));
    }
  });

  const prepared = drizzlePrepared
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, placeholder("supplierId")))
    .prepare("Suppliers-getInfo-D");

  bench("drizzle:p", async () => {
    for (const id of supplierIds) {
      await prepared.execute({ supplierId: id });
    }
  });

  bench("prisma", async () => {
    for (const id of supplierIds) {
      await prisma.supplier.findUnique({
        where: {
          id,
        },
      });
    }
  });
});

//
group("SELECT * FROM product", () => {
  bench("pg", async () => {
    await pg.query('select * from "products"');
  });

  const query = {
    name: "Products-getAll",
    text: 'select * from "products"',
  };
  bench("pg:p", async () => {
    await pgPrepared.query(query);
  });

  bench("drizzle", async () => {
    await drizzle.select().from(products);
  });

  const prepared = drizzlePrepared
    .select()
    .from(products)
    .prepare("Products-getAll-D");

  bench("drizzle:p", async () => {
    await prepared.execute();
  });

  bench("prisma", async () => {
    await prisma.product.findMany();
  });
});

//
group("SELECT * FROM product LEFT JOIN supplier WHERE product.id = ?", () => {
  bench("pg", async () => {
    for (const id of productIds) {
      await pg.query(
        `select "products".*, "suppliers".*
              from "products" left join "suppliers" on "products"."supplier_id" = "suppliers"."id" where "products"."id" = $1`,
        [id]
      );
    }
  });

  const query = {
    name: "Products-getInfo",
    text: `select "products".*, "suppliers".*
    from "products" left join "suppliers" on "products"."supplier_id" = "suppliers"."id" where "products"."id" = $1`,
  };

  bench("pg:p", async () => {
    for (const id of productIds) {
      await pgPrepared.query(query, [id]);
    }
  });

  bench("drizzle", async () => {
    for (const id of productIds) {
      await drizzle
        .select()
        .from(products)
        .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
        .where(eq(products.id, id));
    }
  });

  const prepared = drizzlePrepared
    .select()
    .from(products)
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(eq(products.id, placeholder("productId")))
    .prepare("Products-getInfo-D");

  bench("drizzle:p", async () => {
    for (const id of productIds) {
      await prepared.execute({ productId: id });
    }
  });

  bench("prisma", async () => {
    for (const id of productIds) {
      await prisma.product.findUnique({
        where: {
          id,
        },
        include: {
          supplier: true,
        },
      });
    }
  });
});

//
group("SELECT * FROM product WHERE product.name ILIKE ?", () => {
  bench("prisma", async () => {
    for (const id of productIds) {
      await prisma.product.findUnique({
        where: {
          id,
        },
        include: {
          supplier: true,
        },
      });
    }
  });
});

//
group("SELECT * FROM product WHERE product.name ILIKE ?", () => {
  bench("pg", async () => {
    for (const it of productSearches) {
      await pg.query(
        'select * from "products" where "products"."name" ilike $1',
        [`%${it}%`]
      );
    }
  });

  const query = {
    name: "Products-search",
    text: 'select * from "products" where "products"."name" ilike $1',
  };

  bench("pg:p", async () => {
    for (const it of productSearches) {
      await pgPrepared.query(query, [`%${it}%`]);
    }
  });

  bench("drizzle", async () => {
    for (const it of productSearches) {
      await drizzle
        .select()
        .from(products)
        .where(ilike(products.name, `%${it}%`));
    }
  });

  const prepared = drizzlePrepared
    .select()
    .from(products)
    .where(sql`${products.name} ilike ${placeholder("name")}`)
    .prepare("Products-search-D");

  bench("drizzle:p", async () => {
    for (const it of productSearches) {
      await prepared.execute({ name: `%${it}%` });
    }
  });

  bench("prisma", async () => {
    for (const it of productSearches) {
      await prisma.product.findMany({
        where: {
          name: {
            contains: it,
            mode: "insensitive",
          },
        },
      });
    }
  });
});

group("select all order with sum and count", () => {
  bench("pg", async () => {
    await pg.query(`select "id", "shipped_date", "ship_name", "ship_city", "ship_country", count("product_id") as "products",
        sum("quantity") as "quantity", sum("quantity" * "unit_price") as "total_price"
        from "orders" as "o" left join "order_details" as "od" on "od"."order_id" = "o"."id" group by "o"."id"`);
  });

  const query = {
    name: "Orders-getAll",
    text: `select "id", "shipped_date", "ship_name", "ship_city", "ship_country", count("product_id") as "products",
    sum("quantity") as "quantity", sum("quantity" * "unit_price") as "total_price"
    from "orders" as "o" left join "order_details" as "od" on "od"."order_id" = "o"."id" group by "o"."id"`,
  };
  bench("pg:p", async () => {
    await pgPrepared.query(query);
  });

  bench("drizzle", async () => {
    await drizzle
      .select({
        id: orders.id,
        shippedDate: orders.shippedDate,
        shipName: orders.shipName,
        shipCity: orders.shipCity,
        shipCountry: orders.shipCountry,
        productsCount: sql`count(${details.productId})`.as<number>(),
        quantitySum: sql`sum(${details.quantity})`.as<number>(),
        totalPrice:
          sql`sum(${details.quantity} * ${details.unitPrice})`.as<number>(),
      })
      .from(orders)
      .leftJoin(details, eq(orders.id, details.orderId))
      .groupBy(orders.id);
  });

  const prepared = drizzlePrepared
    .select({
      id: orders.id,
      shippedDate: orders.shippedDate,
      shipName: orders.shipName,
      shipCity: orders.shipCity,
      shipCountry: orders.shipCountry,
      productsCount: sql`count(${details.productId})`.as<number>(),
      quantitySum: sql`sum(${details.quantity})`.as<number>(),
      totalPrice:
        sql`sum(${details.quantity} * ${details.unitPrice})`.as<number>(),
    })
    .from(orders)
    .leftJoin(details, eq(orders.id, details.orderId))
    .groupBy(orders.id)
    .prepare("Orders-getAll-D");

  bench("drizzle:p", async () => {
    await prepared.execute();
  });

  bench("prisma", async () => {
    const result = await prisma.order.findMany({
      include: {
        details: true,
      },
    });
    const orders = result.map(
      (item: {
        id: any;
        shippedDate: any;
        shipName: any;
        shipCity: any;
        shipCountry: any;
        details: any[];
      }) => {
        return {
          id: item.id,
          shippedDate: item.shippedDate,
          shipName: item.shipName,
          shipCity: item.shipCity,
          shipCountry: item.shipCountry,
          productsCount: item.details.length,
          quantitySum: item.details.reduce(
            (sum, deteil) => (sum += +deteil.quantity),
            0
          ),
          totalPrice: item.details.reduce(
            (sum, deteil) => (sum += +deteil.quantity * +deteil.unitPrice),
            0
          ),
        };
      }
    );
  });
});

group("select order with sum and count using limit with offset", () => {
  const limit = 50;

  bench("pg", async () => {
    let offset = 0;
    while (true) {
      const result = await pg.query(
        `select "id", "shipped_date", "ship_name", "ship_city", "ship_country", count("product_id") as "products",
      sum("quantity") as "quantity", sum("quantity" * "unit_price") as "total_price"
      from "orders" as "o" left join "order_details" as "od" on "od"."order_id" = "o"."id" group by "o"."id" ORDER BY o.id ASC limit $1 offset $2`,
        [limit, offset]
      );

      offset += limit;
      if (result.rowCount && result.rowCount < limit) break;
    }
  });

  const query = {
    name: "Orders-getLimit-withOffset",
    text: `select "id", "shipped_date", "ship_name", "ship_city", "ship_country", count("product_id") as "products",
    sum("quantity") as "quantity", sum("quantity" * "unit_price") as "total_price"
    from "orders" as "o" left join "order_details" as "od" on "od"."order_id" = "o"."id" group by "o"."id" ORDER BY o.id ASC limit $1 offset $2`,
  };

  bench("pg:p", async () => {
    let offset = 0;
    while (true) {
      const result = await pgPrepared.query(query, [limit, offset]);
      offset += limit;
      if (result.rowCount && result.rowCount < limit) break;
    }
  });

  bench("drizzle", async () => {
    let offset = 0;
    while (true) {
      const result = await drizzle
        .select({
          id: orders.id,
          shippedDate: orders.shippedDate,
          shipName: orders.shipName,
          shipCity: orders.shipCity,
          shipCountry: orders.shipCountry,
          productsCount: sql`count(${details.productId})`.as<number>(),
          quantitySum: sql`sum(${details.quantity})`.as<number>(),
          totalPrice:
            sql`sum(${details.quantity} * ${details.unitPrice})`.as<number>(),
        })
        .from(orders)
        .leftJoin(details, eq(orders.id, details.orderId))
        .orderBy(orders.id)
        .groupBy(orders.id)
        .limit(limit)
        .offset(offset);

      offset += limit;
      if (result.length < limit) break;
    }
  });

  const prepared = drizzlePrepared
    .select({
      id: orders.id,
      shippedDate: orders.shippedDate,
      shipName: orders.shipName,
      shipCity: orders.shipCity,
      shipCountry: orders.shipCountry,
      productsCount: sql`count(${details.productId})`.as<number>(),
      quantitySum: sql`sum(${details.quantity})`.as<number>(),
      totalPrice:
        sql`sum(${details.quantity} * ${details.unitPrice})`.as<number>(),
    })
    .from(orders)
    .leftJoin(details, eq(orders.id, details.orderId))
    .orderBy(orders.id)
    .groupBy(orders.id)
    .limit(placeholder("limit"))
    .offset(placeholder("offset"))
    .prepare("Orders-getLimit-withOffset-D");

  bench("drizle:p", async () => {
    let offset = 0;
    while (true) {
      const result = await prepared.execute({ limit, offset });
      offset += limit;
      if (result.length < limit) break;
    }
  });

  bench("prisma", async () => {
    let offset = 0;
    while (true) {
      const result = await prisma.order.findMany({
        include: {
          details: true,
        },
        orderBy: {
          id: "asc",
        },
        take: limit,
        skip: offset,
      });
      const orders = result.map((item: any) => {
        return {
          id: item.id,
          shippedDate: item.shippedDate,
          shipName: item.shipName,
          shipCity: item.shipCity,
          shipCountry: item.shipCountry,
          productsCount: item.details.length,
          quantitySum: item.details.reduce(
            (sum: any, deteil: any) => (sum += +deteil.quantity),
            0
          ),
          totalPrice: item.details.reduce(
            (sum: any, deteil: any) =>
              (sum += +deteil.quantity * +deteil.unitPrice),
            0
          ),
        };
      });

      offset += limit;
      if (result.length < limit) break;
    }
  });
});

group("select order where order.id = ? with sum and count", () => {
  bench("pg", async () => {
    await Promise.all(
      orderIds.map(async (id) => {
        await pg.query(
          `select "id", "shipped_date", "ship_name", "ship_city", "ship_country", count("product_id") as "products",
        sum("quantity") as "quantity", sum("quantity" * "unit_price") as "total_price"
        from "orders" as "o" left join "order_details" as "od" on "od"."order_id" = "o"."id" where "o"."id" = $1 group by "o"."id"`,
          [id]
        );
      })
    );
    // for (const id of orderIds) {
    //   await pg.query(
    //     `select "id", "shipped_date", "ship_name", "ship_city", "ship_country", count("product_id") as "products",
    //     sum("quantity") as "quantity", sum("quantity" * "unit_price") as "total_price"
    //     from "orders" as "o" left join "order_details" as "od" on "od"."order_id" = "o"."id" where "o"."id" = $1 group by "o"."id"`,
    //     [id]
    //   );
    // }
  });

  const query = {
    name: "Orders-getById",
    text: `select "id", "shipped_date", "ship_name", "ship_city", "ship_country", count("product_id") as "products",
    sum("quantity") as "quantity", sum("quantity" * "unit_price") as "total_price"
    from "orders" as "o" left join "order_details" as "od" on "od"."order_id" = "o"."id" where "o"."id" = $1 group by "o"."id"`,
  };

  bench("pg:p", async () => {
    await Promise.all(
      orderIds.map(async (id) => {
        await pgPrepared.query(query, [id]);
      })
    );
    // for (const id of orderIds) {
    //   await pg.query(query, [id]);
    // }
  });

  bench("drizzle", async () => {
    await Promise.all(
      orderIds.map(async (id) => {
        await drizzle
          .select({
            id: orders.id,
            shippedDate: orders.shippedDate,
            shipName: orders.shipName,
            shipCity: orders.shipCity,
            shipCountry: orders.shipCountry,
            productsCount: sql`count(${details.productId})`.as<number>(),
            quantitySum: sql`sum(${details.quantity})`.as<number>(),
            totalPrice:
              sql`sum(${details.quantity} * ${details.unitPrice})`.as<number>(),
          })
          .from(orders)
          .leftJoin(details, eq(orders.id, details.orderId))
          .where(eq(orders.id, id))
          .groupBy(orders.id);
      })
    );
    // for (const id of orderIds) {
    //   await drizzle
    //     .select(orders)
    //     .fields({
    //       id: orders.id,
    //       shippedDate: orders.shippedDate,
    //       shipName: orders.shipName,
    //       shipCity: orders.shipCity,
    //       shipCountry: orders.shipCountry,
    //       productsCount: sql`count(${details.productId})`.as<number>(),
    //       quantitySum: sql`sum(${details.quantity})`.as<number>(),
    //       totalPrice:
    //         sql`sum(${details.quantity} * ${details.unitPrice})`.as<number>(),
    //     })
    //     .leftJoin(details, eq(orders.id, details.orderId), {})
    //     .where(eq(orders.id, id))
    //     .groupBy(orders.id)
    // }
  });

  const prepared = drizzlePrepared
    .select({
      id: orders.id,
      shippedDate: orders.shippedDate,
      shipName: orders.shipName,
      shipCity: orders.shipCity,
      shipCountry: orders.shipCountry,
      productsCount: sql`count(${details.productId})`.as<number>(),
      quantitySum: sql`sum(${details.quantity})`.as<number>(),
      totalPrice:
        sql`sum(${details.quantity} * ${details.unitPrice})`.as<number>(),
    })
    .from(orders)
    .leftJoin(details, eq(orders.id, details.orderId))
    .where(eq(orders.id, placeholder("orderId")))
    .groupBy(orders.id)
    .prepare("Orders-getById-D");

  bench("drizzle:p", async () => {
    await Promise.all(
      orderIds.map(async (id) => {
        await prepared.execute({ orderId: id });
      })
    );
  });

  bench("prisma", async () => {
    await Promise.all(
      orderIds.map(async (id) => {
        const result = await prisma.order.findFirst({
          include: {
            details: true,
          },
          where: {
            id,
          },
        });
        const order = {
          id: result!.id,
          shippedDate: result!.shippedDate,
          shipName: result!.shipName,
          shipCity: result!.shipCity,
          shipCountry: result!.shipCountry,
          productsCount: result!.details.length,
          quantitySum: result!.details.reduce(
            (sum: any, deteil: any) => (sum += +deteil.quantity),
            0
          ),
          totalPrice: result!.details.reduce(
            (sum: any, deteil: any) =>
              (sum += +deteil.quantity * +deteil.unitPrice),
            0
          ),
        };
      })
    );
    // for (const id of orderIds) {
    //   const result = await prisma.order.findFirst({
    //     include: {
    //       details: true,
    //     },
    //     where: {
    //       id,
    //     },
    //   });
    //   const order = {
    //     id: result!.id,
    //     shippedDate: result!.shippedDate,
    //     shipName: result!.shipName,
    //     shipCity: result!.shipCity,
    //     shipCountry: result!.shipCountry,
    //     productsCount: result!.details.length,
    //     quantitySum: result!.details.reduce(
    //       (sum, deteil) => (sum += +deteil.quantity),
    //       0
    //     ),
    //     totalPrice: result!.details.reduce(
    //       (sum, deteil) => (sum += +deteil.quantity * +deteil.unitPrice),
    //       0
    //     ),
    //   };
    // }
  });
});

//
group("SELECT * FROM order_detail WHERE order_id = ?", () => {
  bench("pg", async () => {
    for (const id of orderIds) {
      await pg.query(
        `SELECT * FROM "orders" AS o
            LEFT JOIN "order_details" AS od ON o.id = od.order_id
            LEFT JOIN "products" AS p ON od.product_id = p.id
            WHERE o.id = $1`,
        [id]
      );
    }
  });

  const query = {
    name: "Orders-getInfo",
    text: `SELECT * FROM "orders" AS o
    LEFT JOIN "order_details" AS od ON o.id = od.order_id
    LEFT JOIN "products" AS p ON od.product_id = p.id
    WHERE o.id = $1`,
  };

  bench("pg:p", async () => {
    for await (const id of orderIds) {
      await pgPrepared.query(query, [id]);
    }
  });

  bench("drizzle", async () => {
    for (const id of orderIds) {
      await drizzle
        .select()
        .from(orders)
        .leftJoin(details, eq(orders.id, details.orderId))
        .leftJoin(products, eq(details.productId, products.id))
        .where(eq(orders.id, id));
    }
  });

  const prepared = drizzlePrepared
    .select()
    .from(orders)
    .leftJoin(details, eq(orders.id, details.orderId))
    .leftJoin(products, eq(details.productId, products.id))
    .where(eq(orders.id, placeholder("orderId")))
    .prepare("Orders-getInfo-D");

  bench("drizzle:p", async () => {
    for (const id of orderIds) {
      await prepared.execute({ orderId: id });
    }
  });

  bench("prisma", async () => {
    for (const id of orderIds) {
      await prisma.order.findMany({
        where: {
          id,
        },
        include: {
          details: {
            include: {
              product: true,
            },
          },
        },
      });
    }
  });
});

const main = async () => {
  try {
    await run();
  } catch (e) {
    console.error(e);
  }

  await deleteDockerDBs(dockersDbs);
  process.exit(0);
};

main();
