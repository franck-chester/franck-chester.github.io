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
the correct approach at component level, will cause
logically independent **business** concerns to become
coupled through shared code artefacts.

Eventually, on a large codebase such as the Very Group
websites and underlying business systems, this coupling
bmakes it near impossible to experiment or accelarate 
the deployment of new feature, as every single code 
change risks impacting an unrelated feature.

Releases have to be batched, with sufficient time in between
to allow for regression testing. Automating these tests
is itself difficult as each combination of feature causes
 causes an explosion in the number of regression tests required.

All of this is incompatible with moderns ways of developing and deploying
software, which privilege small and frequent feature
releases with quick customer feedback loops to adjust the direction of travel
 and prioritise the next feature.

# Replacing the monolith - carefully

## Ship of Theseus

This thought experiment from the philosophers of ancient Greece asks whether something
that has had all of its constituent parts replaced remains the same thing.

Putting aside the philosophical question, we will inspire
ourselves from that approach and replace our monolith not 
through one big bang all or nothing approach, but very gradually,
bit by bit, so that our customers will at all time
remain unaware of the transformation.

Unfortunately, by definition, a monolith is not made
individual components, so how will we identify the bits 
we can replace? We will slive and dice the monolith 
along logical boundaries that might not exist in
the code base but are meaningful to our team.

## Logically distinct customer journeys

Our squads are already organised along the journeys 
our customers take through our website.
The presentation and business logic associated with let's say product discovery
(browsing for and eventually selecting a specific product)
is logically distinct from customer onboarding (creating an account)
or account management.

These journeys are therefore an easy way to slive through the responsibilities of our monolith.

## Logically distinct architecture layers

Although monolithic,our platform is layered, with distinct areas of the  codebase dealing with front end, business logic and integration with other systems.
Again, the codebase will have undesirable dependencies,
but these architectural layers are another easy way to slice through the monolith.


## Logically distinct bounded contexts

We now look at our entire solution, or rather the problems we are solving with that solution.
This 'problem domain' can be broken down into subdomain thay either
core, generic or supporting:

- The core domain is what truly differentiate us from our competitors,
our bread and butter, our Unique Selling Point (USP).
This is what matters to us as an organisation and where we want to put in all our efforts.

## Strangler fig pattern

# MACH target architecture

## Microservices
## APIs and Events, everything 'as a Service'
## Cloud native components and technologies
## Headless components and services

# Technologies behind our transformation

## SaaS partners 
## AWS PaaS value-added services
## DCX technology stack
