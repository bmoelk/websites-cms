When IT departments rose to prominence the goal was to manage information. It was about databases, CRUD operations, AS400s, 2–3 tier UIs, RAD windows applications and shared files via Novell NetWare. Today, IT departments are less likely to *actively* manage information; they can purchase information management from SaaS vendors. This is why I propose changing what IT stands for to something more accurate and timely: Integration of Technology.

 

Most modern IT organizations buy relatively large blocks of functionality from vendors. Developing technology requires specialized skills that most IT organizations don’t have, can’t afford, and are out of scope for their charter. The build vs. buy debate is pretty much over for much of IT: buy won.

 

But what this leads to is a patchwork of vendor solutions that *sort of* integrate. An emerging and viable strategy is to choose a large ERP/CRM system and then leverage their partner ecosystem for the rest. This is why SalesForce and NetSuite are popular and effective. However, beyond the marketing-material fantasy, integration work for IT departments still remains. Why?

### Most organizations are complex

Most organizations have lots of edge cases and business rules that may distinguish them from their competition. This typically means non-trivial configuration and perhaps extensive customization. None of these large building block systems will do everything organizations want out-of-the-box. They are designed to support customizations precisely because of this reality.

### Vendors do the minimal amount of work to check the box

This happens because of basic capitalism: minimize effort and maximize profit. Vendors will do the bare minimum to achieve working integration, and it will be done primarily to sell their main services. Standard partner ecosystem integrations offer the basic services, but nothing more.

 

 If there’s no market to support a specific ERP/CRM vendor, tough luck. This is why larger vendors with decent API support have huge amounts of partners and smaller vendors that don’t have partners, die. APIs are (were?) all the rage for a reason. APIs are the enabling interface for meaningful integration which is why they are so critical to long term success.

### I.T.’s reality

So after an organization goes through a multi-year and (potentially) multi-million dollar effort, “basic” integration typically doesn’t work. Or it doesn’t work well enough. And even if it does work for one system, quality varies greatly from partner to partner, so it doesn’t work for all of them. 

 

What we end up with is a bunch of large, mission-critical systems that sort of talk to each other….what to do? 

 

IT isn’t left with much of a choice here. IT dives in and fixes it. IT wouldn’t have a purpose if they didn’t. And once an IT department steps off integration’s minimalist happy path, the rabbit hole goes deep. Integration work becomes the reason why IT departments hire “Architects” and buy those dreaded ESB thingys. The market is chock full of [IPaaS vendors](https://www.infoworld.com/article/3049152/data-integration/integration-platform-as-a-service-the-new-kid-on-the-integration-block.html) [“Integration Platform as a Service”](https://www.infoworld.com/article/3049152/data-integration/integration-platform-as-a-service-the-new-kid-on-the-integration-block.html) (MuleSoft, Boomi, Jitterbit, SnapLogic, etc.) because this is a real situation. One could throw Zapier and tray.io into that mix as well.

 

We have also seen the emergence of integration services within major cloud vendors. Things like AWS’ Data Pipeline and Glue, Azure Event Grid, Google Cloud DataFlow and Pub/Sub all can be used as components of sophisticated integration solutions. Likewise open source frameworks like AirFlow have become popular. IT departments are wise to leverage them.

### Focus on semantic-based events, not raw data

Integration of Technology departments need to go beyond CRUD. We must elevate the game by focusing on semantic-based events and think about how persistent state ***changes over time. ***Event-sourcing champions like Greg Young have been hammering this latter point for the better part of a decade now. Listen to them.

 

The CRUD perspective views this challenge as one of data synchronization. The thinking goes something like, two-way synchronization of all the underlying table changes from one system to another will solve this problem. This is a naive approach as I detail [here](https://medium.com/brainendeavor/2-way-data-synchronization-is-often-a-lazy-and-naive-strategy-9c7d0c08b572). 

 

Independent vendors (and micro-services!) are each responsible for their own internal consistency and reconciliation with interdependent upstream/downstream systems. When IT developers start embracing them, the need to shift their thinking from CRUD to semantic-based events become paramount.

 

Secondly, IT must understand that waiting for the overnight batch job to run is an antiquated solution that is misaligned with modern expectations. Shifting our thinking from more frequently scheduled batch oriented processes to processing near real time semantic-based events with minimal latency is part of the new role IT must accept.

 

I’m challenged to come up with other pragmatic ways to handle the complexity involved beyond semantic-based event processing. Every vendor believes they are the-center-of-the-universe monolith; IT’s job is to make sure their world view remains in tact. This is particularly important to manage the upgrade cycle. I generally prefer to build around, rather than within.

### Where I.T. still needs to build

Even when IPaaS products work, IT developers typically need to code stuff within those platforms to get the job done. ***The irony is that the value proposition of IPaaS vendors break down precisely because the value proposition of ERP/CRM system customization is so great.*** The more these core systems are customized, the more likely standard integrations will fail. I am undoubtedly biased in this perspective, but ultimately, code wins the day.

 

IT Organizations will need to navigate a wide variety of data formats, APIs, implementation quirks and sub-par documentation to make this happen. However this is the easy part. The more challenging part is understanding the business goals/processes and crafting integrations that support them. And to do it in a maintainable and extensible way.

 

In order to preserve the “smart endpoints, dumb pipes” mantra, IT must be careful about how much necessary abstraction and decoupling to build out. It’s easy to get sucked into the ESB model and IPaaS vendors will gladly encourage this to maximize their profits by increasing switching costs. 

 

This is the new work of IT. New techniques and tools have emerged to help: asynchronous message queuing, distributed event logs, event sourcing/CQRS architectures, idempotent processing, service mesh solutions, Kubernetes/docker-based orchestration, etc.

 

 It is in this context that integration work is most challenging and rewarding. IT’s new responsibility is all about integration of larger services. A smartly integrated enterprise is one that can leverage these services effectively without being too brittle to change. They can support the business goals elegantly and scale as needed. This is why I.T. should no longer stand for “Information Technology”, but rather “Integration of Technology”.
