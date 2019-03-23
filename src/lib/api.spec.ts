// tslint:disable:no-expression-statement
import test from 'ava';
import { Dsl } from './api';

test.cb('can make a float', t => {
  const data = {
    Quantity: 1212.233
  };

  const dsl = new Dsl(data);

  const val = dsl.float('Quantity');
  t.is(typeof val, 'number');
  t.is(val, data.Quantity);
  t.end();
});

test.cb('can make an integer', t => {
  const data = {
    'Order Number': 1000.0
  };

  const dsl = new Dsl(data);

  const val = dsl.integer('Order Number');
  t.is(typeof val, 'number');
  t.is(val, 1000);
  t.end();
});

test.cb('can floor an integer', t => {
  const data = {
    'Order Number': 1000.8
  };

  const dsl = new Dsl(data);

  const val = dsl.integer('Order Number');
  t.is(typeof val, 'number');
  t.is(val, 1000);
  t.end();
});

test.cb('can make string titlecase', t => {
  const data = {
    'Product Name': 'iceberg lettuce'
  };

  const dsl = new Dsl(data);

  const val = dsl.titleCase(dsl.value('Product Name'));
  t.is(typeof val, 'string');
  t.is(val, 'Iceberg Lettuce');
  t.end();
});

test.cb('can get value', t => {
  const data = {
    'Product Name': 'iceberg lettuce'
  };

  const dsl = new Dsl(data);

  const val = dsl.value('Product Name');
  t.is(typeof val, 'string');
  t.is(val, data["Product Name"]);
  t.end();
});

test.cb('throws error when missing value', t => {
  const data = {
    'Product Name': 'iceberg lettuce'
  };

  const dsl = new Dsl(data);

  t.throws(() => dsl.value('Product Nome', true));
  t.end();
});