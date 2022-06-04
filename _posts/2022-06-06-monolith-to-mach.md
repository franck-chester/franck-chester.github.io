---
title: From monolithic to MACH architecture 
date: 2022-06-06
tags: aws mach architecture monolith
---

It's been a while since my last proper post, 
but I've given a presentation last week that, I believe,
 deserves to be expanded into a post.

The presentation was about my current employer,
 the Very Group, transformation away from its legacy systems and processes,
and the technology behind that modernisation.

My contribution to the presentation was specifically about how
the Digital Customer Experience (DCX) tribe will rearchitect
our flagship e-commerce websites away from our aging 
monolithic platforms towards a modern, composable, MACH architecture.

Here, I reproduce the slides, together with additional
thoughts I didn't have time to cover during my slot.

# The problem of the monolith

A monolithic platform such as Oracle e-commerce ATG
will always, sooner or later, lead to spaghetti logic.
A single codebase will cause well intentioned engineers
to apply DRY and SOLID principles, which although
the correct approach at component level, will eventually cause
logically independent business concerns to become
coupled through shared code artefacts.

Eventually, on a large codebase such as the Very Group
websites and underlying business systems, this coupling
makes it near impossible to experiment or accelarate 
the deployment of new features, as every single code 
change risks impacting other unrelated features.

Releases have to be batched, with sufficient time in between
to allow for regression testing. Automating these tests
is itself difficult as each combination of features causes
 causes an explosion in the number of regression tests required.

All of this is incompatible with moderns ways of developing and deploying
software, which privilege small and frequent feature
releases with quick customer feedback loops to adjust the direction of travel
before prioritising the next feature.

# Replacing the monolith - carefully

## Ship of Theseus

This thought experiment from the philosophers of ancient Greece asks whether something
that has had all of its constituent parts replaced remains the same thing.

Putting aside the philosophical question, we will inspire
ourselves from that approach and replace our monolith not 
through one big bang all or nothing approach, but very gradually,
plank by plank, so that our customers will at all time
remain unaware of the transformation.

Unfortunately, by definition, a monolith is not made of
individual components, so how will we identify the bits 
we can replace?

We will slice and dice the monolith 
along logical boundaries that might not exist in
the code base but are meaningful to our team.

## Logically distinct customer journeys

Our squads are already organised along the journeys 
our customers take through our website.
The presentation and business logic associated with let's say product discovery
(browsing for and eventually selecting a specific product)
is logically distinct from customer onboarding (creating an account)
or account management.

These journeys are therefore an easy way to slice through the responsibilities of our monolith.

## Logically distinct architecture layers

Although monolithic,our platform is layered, with distinct areas of the codebase dealing with front end, business logic and integration with other systems.
Again, the codebase itself will have undesirable dependencies,
but these architectural layers are logically independent and another easy way to slice through the monolith.


## Logically distinct bounded contexts

We now look at our entire solution, or rather the problems we are solving with that solution.
This 'problem domain' can be broken down into subdomains that either
core, generic or supporting:

- The core domain is what truly differentiates us from our competitors,
our bread and butter, our Unique Selling Point (USP).
This is what matters to us as an organisation and where we want to put in all our efforts.

Our core problem here at the Very Group is how to provide the best digital customer experience, across multi channel,
and make it as easy as possible to find and buy yhe right product, at the right price, with
if required financial options, while meeting all our compliance requirements.

- On the other hand, many problems in our domain are 
quite generic across our industry and actually quite difficult to solve in any way
that would differentiate us from our competitors.

Instead, we are better off partnering with 3rd parties
who are happy to treat these problems as their core domain
and for us to simply consume those 3rd parties' solution to these problems.

- finally, supporting sub domains are problems that we must 
solve in order to address our core problems, but will not
in themselves differentiate us from our competitors.

Within these domains, we can now identify problem area that are specific
enough from other problem areas. Given problem X, let's say 
"data associated with a customer", we can clearly state
that it belongs in the "customer" problem area, and not the "shopping cart" one.

We can draw a clear boundary around these problem areas, 
and deal with each independently from others.

This is of course a gross over-simplification of what Domain Driven Design
calls "Bounded Contexts", see Evans' original book () or the much
more actionable followup by his colleagelue () for a much
better explanation.

## Strangler fig pattern

We have now sliced and diced our monolith into bounded contexts,
mapped these to our customer journeys and architecture layers
and decided whether they address a core, generic or supporting
problem. We now need to start reimplementing them away from
the monolith, and introduce them into the overall solution
without the customer being aware.

We will achieve this by leveraging the Strangler Fig pattern,
and introducing façade components in front of our monolith, 
tasked with shunting traffic away from the monolith
toward our new components as and when these become available.

As we reimplement more and more ofnour solution on our
new architecture, the façade will shunt more and more
requests away from the monolith, until eventually we will
be able to remove the monolith, and the façade altogether.

Again this is a gross over simplification. There will
be multiple façades, between architecture layers, and
where our customer journeys are not truly independent,
each trying to expose a nice clean interface over the spaghetti 
logic underneath it.

# MACH target architecture

MACH is a cute acronym coined in the retail industry
to market SaaS platforms that can be composed into
best of breed e-commerce solutions.

It stands for Microservices, API-first, Cliud native and Headless components.

## Microservices

Microservices are the technical implementation of the bounded contexts we mentioned earlier.
Having identified tightly defined problems areas with
a clear boundary between what does and doesn't pertain to a specific problem,
we can design and implement specific solutions to these specific problems.
These solutions should each be applications in their own right,
managed entirely separately from each other, truly independently.

Instead of one big monolithic solution to all ourbproblems, we will
have much smaller (hence the micro- prefix) individual solutions to individual problems.
## APIs and Events, everything 'as a Service'
## Cloud native components and technologies
## Headless components and services

# Technologies behind our transformation

## SaaS partners 
## AWS PaaS value-added services
## DCX technology stack
