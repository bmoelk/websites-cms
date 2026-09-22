*TL;DR* — Start with the simple, ideal architecture: 1-way data flow with message-based events. Adopt 2-way synchronization as a ***last*** resort.

 

When people wore analog watches, it was common practice to “synchronize time” within a group to have an accurate measure of when to meet up or reconvene. This is now a quaint relic of a past life as most time pieces are automatically adjusted by mobile networks connected to the USNO clock or some other atomic clock with high precision. 

 

Inevitably, an IT organization of reasonable size will have more than one system and will need to share data across multiple systems. The simplest solution that could possibly work is to “synchronize the data” across those systems. The naive belief is to think of that problem as if we are wearing analog watches and all we need to do is pick an official time and twist our crowns to maintain the data integrity of our IT systems.

 

Unfortunately, data synchronization across heterogeneous systems is a much more complicated problem. It is far more involved and varied than homogeneous systems. And certainly more complicated than synchronizing watches with one dimension, one input, one output and a large threshold of imprecision.

### Why is This Lazy and Naive

The most difficult challenge is NOT that we have heterogenous systems with different data models and different databases and different APIs written in different styles. This is a technical challenge that can be resolved by diligent, yet straightforward use of various vendor supplied or open source frameworks, libraries, and protocols. The real problem is the bias in IT to make every problem into a technical one.

 

The reason why distributed data synchronization is difficult is because IT needs to understand business processes and workflows in sufficient depth to construct a solid synchronization strategy. Declaring “2-way synchronization” as the answer is not a strategy; it’s a brute force reaction that ignores the details of the problem.

 

Any reasonable synchronization strategy involves defining data ownership, system scope, and system responsibility. Those are the critical components of a comprehensive, informed, and workable strategy. Often times, 2-way synchronization ends up being overkill anyway.

 

Keeping these responsibilities clear and distinct is even more challenging when there are multiple teams and multiple projects in motion. Conway’s law combined with varying team talent will create pockets of dysfunctional compensation when it comes to data integration. Different business departments will have stronger mandates and thus create an imbalance of resources and priority. These facets very rarely simplify the problem.

### The Problem with 2-way Synchronization

The most common problems with 2-way synchronization in distributed systems are update conflicts and duplicate insertions.

 

The first is a question of which update “wins”. When two updates of the same semantic thing that exists across multiple systems happen at different times in more than one system, which update takes precedence? It’s easy to say “last one wins” or “first one wins” but it is not always straightforward to determine which update occurred first or last without sophisticated mechanisms like vector clocks (that usually don’t exist).

 

Beyond that, what do we do with the update that fails? Is that update’s existence wiped from the record as if never happened in the first place? Or do we attempt to merge those updates in ways that do not conflict? Or do we involve a human resource to resolve manually?

 

Duplicate insertions can be even more problematic. Unless there are consistent and unique ID values there are few ways to match up the same thing when insertions happen in two or more systems. When dealing with people, email addresses have been the most common way to match people across systems, however the same person can have multiple email addresses. Likewise, not all things have consistent and distributedly allocated IDs like an email address. 

 

Even when these things can be matched up, you now have the update conflict problem to deal with. And then imagine adding a 3rd or 4th system.

### Common Exception to the Rule: Single User, Multiple devices

A fairly common use case that 2-way synchronization may be appropriate for is single user, multiple devices. Because a single person is making changes, applying a brute force, 2-way synchronization approach may work well. “Last one wins” is an acceptable default conflict resolution strategy and other conflicts (e.g. duplicates) can be resolved quickly by one person.

### Change the Problem

IT needs to think about this problem differently. This is not exclusively a technical problem.

 

The ideal solution is to have 1-way data flows with explicit ownership. Changes occur in the ***system of record*** and they are propagated to the other systems that need to know. Determine the “system of record” explicitly for each data element. If there are multiple systems of record for a given data element, this is likely a red flag. It may be better to unify the system of record, than to maintain a 2-way data synchronization implementation.

> *FWIW, we have seen this play out in popular UI framework architecture patterns: 2-way data binding vs. Flux. And Flux is a better choice. Don’t @ me.*

***Do not assume all systems are equal in terms of their need to change and maintain data.*** Many systems only need to be notified that some relevant business event occurred in another system. In other words, instead of synchronizing raw data, send a message. 

 

 Make that message semantically meaningful. Make sure that message captures that a relevant action took place in the system of record. This is why asynchronous, message-based, CQRS style architectures with idempotent processing make more sense for distributed systems. It is also far more extensible because adding that 3rd, 4th or 8th system is fairly straightforward.

### The Plan

1. Do the appropriate analysis. Understand system responsibilities, data ownership, business processes, and synchronization needs.
2. Strongly prefer 1-way data flow with semantically meaningful, message-based events.
3. Adopt 2-way synchronization as a last resort.
