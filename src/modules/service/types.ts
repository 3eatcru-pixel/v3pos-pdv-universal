export interface ServiceClient {
  id: string;
  enterpriseId: string;
  name: string;
  phone: string;
  email?: string;
  history: string[]; // Appointment IDs
  notes?: string;
  createdAt: number;
}

export interface ServiceDefinition {
  id: string;
  enterpriseId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  category: string;
  colorCode: string;
  active: boolean;
}

export interface ServiceProvider {
  id: string; // Links to global staff ID if needed
  enterpriseId: string;
  name: string;
  role: string;
  skills: string[]; // List of ServiceDefinition IDs they can perform
  commissionRate: number; // percentage
  active: boolean;
  colorCode: string;
}

export interface ServiceResource {
  id: string;
  enterpriseId: string;
  name: string; // e.g., "Sala 1", "Cadeira de Barbeiro A"
  type: string;
  active: boolean;
}

export type AppointmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface ServiceAppointment {
  id: string;
  enterpriseId: string;
  clientId: string;
  providerId: string;
  serviceId: string;
  resourceIds: string[]; // Resources used for this appointment
  startTime: number; // Unix timestamp
  endTime: number; // Unix timestamp
  status: AppointmentStatus;
  totalPrice: number;
  notes?: string;
  createdAt: number;
}
