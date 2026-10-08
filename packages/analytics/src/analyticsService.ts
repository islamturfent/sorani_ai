import { TenantContext } from '@sorani/shared';
import { DomainEventType } from '@sorani/events';

export interface AnalyticsCounters {
  totalRestaurants: number;
  totalReservations: number;
  confirmedReservations: number;
  failedReservations: number;
  totalCalls: number;
  avgConfirmationTimeMs?: number;
}

export interface ReservationSnapshot {
  status: string;
  count: number;
}

/** Aggregates platform metrics (event-driven; extend with time series later). */
export class AnalyticsService {
  private counters: AnalyticsCounters = {
    totalRestaurants: 0,
    totalReservations: 0,
    confirmedReservations: 0,
    failedReservations: 0,
    totalCalls: 0,
  };
  private statusCounts = new Map<string, number>();

  constructor() {
    void DomainEventType;
  }

  ingest(type: string): void {
    switch (type) {
      case DomainEventType.RESERVATION_CREATED:
      case DomainEventType.RESERVATION_CONFIRMED:
        this.counters.confirmedReservations++;
        this.counters.totalReservations++;
        break;
      case DomainEventType.RESERVATION_REQUESTED:
        this.counters.totalReservations++;
        break;
      case DomainEventType.RESERVATION_FAILED:
        this.counters.failedReservations++;
        break;
      case DomainEventType.CALL_STARTED:
        this.counters.totalCalls++;
        break;
    }
    this.statusCounts.set(type, (this.statusCounts.get(type) ?? 0) + 1);
  }

  getCounters(_ctx: TenantContext): AnalyticsCounters {
    return { ...this.counters };
  }

  getReservationSnapshot(): ReservationSnapshot[] {
    return Array.from(this.statusCounts.entries())
      .filter(([k]) => k.startsWith('reservation.'))
      .map(([status, count]) => ({ status, count }));
  }
}
