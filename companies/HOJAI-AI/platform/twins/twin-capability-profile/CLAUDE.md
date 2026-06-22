# Twin Capability Profile

**Port:** 4150
**Type:** Platform Twin Service (Discovery)
**Package:** `@rtmn/twin-capability-profile`

## Overview

Every Twin advertises what it can DO (acceptQuote, checkAvailability, holdRoom, requestHousekeeping, etc.) via this discovery layer. SkillOS handles implementation; this service is the registry that lets agents find Twins by capability rather than by name.