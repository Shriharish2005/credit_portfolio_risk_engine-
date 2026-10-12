import React, { useEffect, useState } from 'react';
import {
  Radio,
  Play,
  RotateCw,
  CheckCircle,
  AlertCircle,
  Zap,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Building,
  DollarSign,
  Activity,
  Layers,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { riskApi } from '../services/api';

interface KafkaStreamStatus {
  kafka_enabled: boolean;
  bootstrap_servers: string;
  topic: string;
  consumer_group: string;
  producer_status: {
    connected: boolean;
    published_count: number;
    failed_count: number;
  };
  consumer_status: {
    running: boolean;
    processed_count: number;
    error_count: number;
    last_event_time: string | null;
  };
}

interface StreamEventItem {
  timestamp: string;
  event_type: string;
  loan_id: string;
  borrower_id: string;
  published_to_kafka: boolean;
  risk_impact?: {
    action: string;
    pd?: number;
    lgd?: number;
    ead?: number;
    expected_loss?: number;
    new_drawn_balance?: number;
    new_ead?: number;
    new_expected_loss?: number;
    new_pd?: number;
    status?: string;
  };
}

export const KafkaLiveStreamCard: React.FC<{ onRefreshPortfolio?: () => void }> = ({ onRefreshPortfolio }) => {
  const [status, setStatus] = useState<KafkaStreamStatus | null>(null);
  const [events, setEvents] = useState<StreamEventItem[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  const fetchData = () => {
    riskApi.getKafkaStatus()
      .then((data) => setStatus(data))
      .catch((e) => console.error('Failed to load Kafka status:', e));

    riskApi.getKafkaEvents(25)
      .then((records) => {
        if (records && records.length > 0) {
          const mapped: StreamEventItem[] = records.map((r) => ({
            timestamp: new Date(r.timestamp).toLocaleTimeString(),
            event_type: r.event_type,
            loan_id: r.loan_id,
            borrower_id: r.borrower_id,
            published_to_kafka: r.published_to_kafka,
            risk_impact: r.risk_impact,
          }));
          setEvents(mapped);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleEmitEvent = async (eventType: string) => {
    setLoading(true);
    try {
      const res = await riskApi.emitKafkaEvent({ event_type: eventType });
      const newEvent: StreamEventItem = {
        timestamp: new Date().toLocaleTimeString(),
        event_type: res.event.event_type,
        loan_id: res.event.loan_id,
        borrower_id: res.event.borrower_id,
        published_to_kafka: res.published_to_kafka,
        risk_impact: res.risk_engine_result,
      };
      setEvents((prev) => [newEvent, ...prev.slice(0, 19)]);
      fetchData();
      if (onRefreshPortfolio) onRefreshPortfolio();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateStream = async () => {
    setIsSimulating(true);
    try {
      await riskApi.simulateKafkaStream(8, 0.4);
      // Wait for batches to run
      setTimeout(() => {
        setIsSimulating(false);
        fetchData();
        if (onRefreshPortfolio) onRefreshPortfolio();
      }, 3500);
    } catch (err) {
      setIsSimulating(false);
      console.error(err);
    }
  };

  const filteredEvents = activeFilter === 'ALL'
    ? events
    : events.filter((e) => e.event_type === activeFilter);

  return (
    <div className="space-y-6">
      {/* Telemetry Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Cluster / Broker */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground font-mono">BROKER / KRAFT</span>
            <div className={`w-2.5 h-2.5 rounded-full ${status?.producer_status.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          </div>
          <div className="text-lg font-bold font-mono text-foreground truncate">
            {status?.bootstrap_servers || 'localhost:9092'}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span>Mode:</span>
            <span className="font-semibold text-primary">Apache Kafka KRaft</span>
          </div>
        </div>

        {/* Topic */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground font-mono">TOPIC</span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
              Active
            </Badge>
          </div>
          <div className="text-lg font-bold font-mono text-primary truncate">
            {status?.topic || 'credit-events'}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Group: <span className="font-mono">{status?.consumer_group || 'credit-risk-consumer-group'}</span>
          </div>
        </div>

        {/* Producer Throughput */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground font-mono">PRODUCED EVENTS</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {status?.producer_status.published_count ?? 0}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Buffer: <span className="text-emerald-400 font-medium">Synchronized</span>
          </div>
        </div>

        {/* Consumer State */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground font-mono">CONSUMER ENGINE</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {status?.consumer_status.processed_count ?? 0}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 truncate">
            Last: <span className="font-mono">{status?.consumer_status.last_event_time ? new Date(status.consumer_status.last_event_time).toLocaleTimeString() : 'Ready'}</span>
          </div>
        </div>
      </div>

      {/* Interactive Trigger Control Bar */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              Real-Time Financial Event Generator & Streaming Simulator
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Emit transactional credit events through Kafka topic into the quantitative risk engine (PD, LGD, EAD, EL).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleSimulateStream}
              disabled={isSimulating}
              className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Streaming Events...' : 'Simulate Live Stream (8 Events)'}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchData}
              className="h-8 w-8 p-0"
              title="Refresh Telemetry"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Specific Event Injections */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <span className="text-xs font-semibold text-muted-foreground self-center mr-1">Inject Event:</span>
          {[
            { type: 'LOAN_CREATED', label: 'Loan Created', color: 'border-blue-500/30 hover:bg-blue-500/10 text-blue-400' },
            { type: 'PAYMENT_RECEIVED', label: 'Payment Received', color: 'border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400' },
            { type: 'PAYMENT_MISSED', label: 'Payment Missed (30/60 DPD)', color: 'border-amber-500/30 hover:bg-amber-500/10 text-amber-400' },
            { type: 'UTILIZATION_CHANGED', label: 'Utilization Shift', color: 'border-purple-500/30 hover:bg-purple-500/10 text-purple-400' },
            { type: 'INCOME_CHANGED', label: 'Income Revised', color: 'border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400' },
            { type: 'DEFAULT_EVENT', label: 'Default Declared (Stage 3)', color: 'border-rose-500/30 hover:bg-rose-500/10 text-rose-400' },
          ].map((btn) => (
            <Button
              key={btn.type}
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => handleEmitEvent(btn.type)}
              className={`h-7 text-xs border rounded-lg ${btn.color}`}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Live Event Feed & Impact Audit */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Real-Time Event Stream & Engine Impacts</span>
            <Badge variant="outline" className="text-[10px] font-mono">
              {filteredEvents.length} events logged
            </Badge>
          </div>

          <div className="flex gap-1">
            {['ALL', 'PAYMENT_RECEIVED', 'PAYMENT_MISSED', 'UTILIZATION_CHANGED', 'DEFAULT_EVENT'].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`text-[10px] px-2 py-1 rounded font-mono transition-colors ${
                  activeFilter === f ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground space-y-2">
            <Radio className="w-8 h-8 mx-auto opacity-30 animate-pulse" />
            <p className="text-xs">No live events captured in this session yet.</p>
            <p className="text-[11px] text-muted-foreground/70">Click "Simulate Live Stream" or inject an individual event above.</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {filteredEvents.map((evt, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-muted/40 border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-muted/60 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-muted-foreground">{evt.timestamp}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono font-bold ${
                        evt.event_type === 'PAYMENT_RECEIVED'
                          ? 'text-emerald-400 border-emerald-500/30'
                          : evt.event_type === 'PAYMENT_MISSED'
                          ? 'text-amber-400 border-amber-500/30'
                          : evt.event_type === 'DEFAULT_EVENT'
                          ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                          : 'text-primary border-primary/30'
                      }`}
                    >
                      {evt.event_type}
                    </Badge>
                    <span className="text-xs font-mono font-semibold text-foreground">{evt.loan_id}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Borrower: <span className="font-mono text-foreground/80">{evt.borrower_id}</span>
                  </div>
                </div>

                {/* Risk Engine Output */}
                {evt.risk_impact && (
                  <div className="flex items-center gap-4 text-xs font-mono bg-background/60 px-3 py-1.5 rounded-lg border border-border">
                    {evt.risk_impact.new_drawn_balance !== undefined && (
                      <div>
                        <span className="text-muted-foreground text-[10px] block">New Balance</span>
                        <span className="font-bold text-foreground">${evt.risk_impact.new_drawn_balance.toLocaleString()}</span>
                      </div>
                    )}
                    {evt.risk_impact.new_pd !== undefined && (
                      <div>
                        <span className="text-muted-foreground text-[10px] block">Adjusted PD</span>
                        <span className="font-bold text-amber-400">{(evt.risk_impact.new_pd * 100).toFixed(2)}%</span>
                      </div>
                    )}
                    {evt.risk_impact.new_ead !== undefined && (
                      <div>
                        <span className="text-muted-foreground text-[10px] block">Recalculated EAD</span>
                        <span className="font-bold text-foreground">${evt.risk_impact.new_ead.toLocaleString()}</span>
                      </div>
                    )}
                    {evt.risk_impact.new_expected_loss !== undefined && (
                      <div>
                        <span className="text-muted-foreground text-[10px] block">Updated EL</span>
                        <span className="font-bold text-rose-400">${evt.risk_impact.new_expected_loss.toLocaleString()}</span>
                      </div>
                    )}
                    {evt.risk_impact.status && (
                      <div>
                        <span className="text-muted-foreground text-[10px] block">Status</span>
                        <span className={`font-bold ${evt.risk_impact.status === 'DEFAULTED' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {evt.risk_impact.status}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
