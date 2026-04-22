import { indexedDBAdapter } from '../adapters/indexedDBAdapter';
import { Customer } from '../types';

class CustomerRepository {
  async create(customer: Customer): Promise<Customer> {
    return indexedDBAdapter.add('customers', customer);
  }

  async update(customer: Customer): Promise<Customer> {
    return indexedDBAdapter.update('customers', customer);
  }

  async findById(id: string): Promise<Customer | undefined> {
    return indexedDBAdapter.get<Customer>('customers', id);
  }

  async findAll(): Promise<Customer[]> {
    return indexedDBAdapter.getAll<Customer>('customers');
  }
}

export const customerRepository = new CustomerRepository();

