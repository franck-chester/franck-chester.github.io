---
title: 2021-10-15-Architecture descriptions in the cloud
tags: architecture
---

This week I have started documenting our target architecture. Now, what I was actually asked to do was "document our target cloud infrastructure", but I have been there before and believe a formal (ish) overall architecture description is required before diving into any specific problem area.

What do I mean by an architecture description? I mean [Systems and software engineering — Architecture description
ISO/IEC/IEEE 42010] (http://www.iso-architecture.org/ieee-1471/ads/) which is an old fashion standard I was once required to adhere to for a government project. 

At the time it was easy, and a good idea, to use the viewpoints and perspectives listed in [Rozanski and Woods "Software Systems Architecture"](https://www.viewpoints-and-perspectives.info) book. 
I have since learned to tailor them to each specific engagement and its domain, and now use the book for inspiration rather than an actual reference. 
Notably, when architecting in the cloud, I find the 5 pillars shared by the major cloud vendors ([AWS](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html), [Azure] (https://docs.microsoft.com/en-us/azure/architecture/framework/) and [GCP](https://cloud.google.com/architecture/framework) ) "well architected" frameworks are perspectives that are now well understood by my colleagues and stakeholders. 

I have also started incorporating concepts from [C4 modeling](https://c4model.com/), in particular its ability to zoom in and out of the architecture to provide different levels of details to different audiences (what Gregor Hohpe calls ["riding the architect elevator"](https://architectelevator.com/)). 

The result are architecture descriptions that are sliced and diced along 3 axis:
- Level of details
  - High level / macro / Context level
    Where I detail the elements of the architecture meaningful to the outside world, i.e. the wider [Enterprise Architecture](https://searchcio.techtarget.com/definition/enterprise-architecture), or a solution portfolio 
    
