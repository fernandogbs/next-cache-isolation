# System overview (post gap review)

Updated after the GHSA-mfr8 slice design and the 0.2.0 engine extensions.
Cache policy is **per scenario**.

## Modules

```mermaid
flowchart LR
  CLI[CLI Interface]
  Catalog[Advisory Catalog]
  Orchestrator[Test Orchestrator]
  ProcessMgr[Next.js Process Manager]
  ScenarioEng[Scenario Engine]
  Latch[Fixture Latch Control]
  HTTP[HTTP Request Engine]
  ExtCache[External Cache Adapter]
  App[Next.js Fixture App]
  Oracle[Isolation Oracle]
  Report[Report Generator]

  CLI --> Catalog
  CLI --> Orchestrator
  Orchestrator --> ProcessMgr
  Orchestrator --> ScenarioEng
  ScenarioEng --> Latch
  ScenarioEng --> HTTP
  ScenarioEng --> ExtCache
  ProcessMgr --> App
  HTTP --> App
  Latch --> App
  ExtCache --> App
  HTTP --> Oracle
  Oracle --> Report
  Orchestrator --> Report
```

## Per-scenario cache policies

```mermaid
flowchart TD
  Start[Start scenario]
  Start --> Policy{cachePolicy}
  Policy -->|memory| MemCold[Cold start process]
  MemCold --> Race[Race or warm while process stays up]
  Race --> ObserveSame[Observe same process]
  ObserveSame --> Done[Stop process]

  Policy -->|persistent| PersistSetup[Start process]
  PersistSetup --> Poison[Poison or fill]
  Poison --> Restart[Restart process]
  Restart --> ObserveAfter[Observe after restart]
  ObserveAfter --> DonePersist[Stop process]

  Policy -->|external| ExtReset[Reset Redis prefix]
  ExtReset --> ExtWarm[Warm on started process]
  ExtWarm --> ExtRestart[Restart process]
  ExtRestart --> ExtObserve[Observe after restart]
  ExtObserve --> ExtCleanup[Reset prefix and dispose]
```

Published GHSA-mfr8 fixtures use `memory`: race and observe share one process.
See
[2026-11-05-ghsa-mfr8-slice-design.md](../superpowers/specs/2026-11-05-ghsa-mfr8-slice-design.md)
and
[2026-11-10-external-flight-tenant-design.md](../superpowers/specs/2026-11-10-external-flight-tenant-design.md).

## GHSA-mfr8 execution

```mermaid
stateDiagram-v2
  [*] --> ValidateFixture
  ValidateFixture --> BuildApp: manifest OK
  ValidateFixture --> Error: invalid
  BuildApp --> StartServer
  StartServer --> HealthCheck
  HealthCheck --> ArmLatch: healthPath 200
  HealthCheck --> Error: timeout
  ArmLatch --> ColdRace: latch armed
  ColdRace --> ObserveSameProcess: race settled
  ObserveSameProcess --> ValidateOracle
  ValidateOracle --> Report
  Report --> StopServer
  StopServer --> [*]
  Error --> StopServer
```
