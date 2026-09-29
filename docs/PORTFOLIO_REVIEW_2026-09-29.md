# Portfolio review — 29 September 2026

## Assessment

The portfolio has credible professional substance: independent ownership of research-data processing, production geospatial systems, field instrumentation, and graduate scientific modeling. The original visual language was already restrained and professional. Its biggest weaknesses were prioritization, inconsistent claims, and small but visible technical errors.

The revised version makes the strongest work much easier to inspect. It is a stronger presentation of an environmental-data and scientific-computing professional. It does not, by itself, establish senior-level predictive-modeling experience. That distinction matters more than another visual effect.

Status: changes are local and reviewable; the public GitHub Pages site has not been updated.

## Changes made

| Area | What was weak | Revision |
| --- | --- | --- |
| Homepage introduction | Broad labels and repeated abstractions delayed the evidence. | Shortened the introduction and named the Corteva, PLRB, and Iowa State work. |
| Work hierarchy | A large award-post screenshot dominated; undergraduate work occupied equal card space to Corteva. | Three comparable cards lead with Corteva, production systems, and graduate research. Undergraduate experience remains in the chronology. Award evidence remains in the PLRB case study. |
| Agricultural relevance | The soybean demonstration appeared after the weather demo, well below a large work section. | Put soybean first among interactive projects and brought the section higher on the page. |
| Skills | The coding and data work came last. | Lead with Data Pipelines & Quality Control; retain four concise, résumé-grounded capability groups. |
| Case studies | Results appeared after several long sections. Wide text ran almost edge to edge. | Move results below the hero and narrow the page to a consistent reading width. |
| Corteva evidence | The displayed historical code excerpt was incomplete, had literal dollar signs in Python strings, and omitted explicit CRS handling. Illustration-only maps could be mistaken for substantive analytical results. | Replace that excerpt and its two illustrative pipeline maps with a four-step explanation of the actual processing workflow. No newly written code is presented as historic production code. |
| Corteva claims | Approximate per-collection savings became a more precise campaign total; a positive relationship was asserted without a displayed statistic. | Retain approximately one hour per collection and seven sites. Describe examining crop-stress relationships without implying a quantified result. |
| Thesis | Visitors landed directly in an embedded PDF, with little explanation of the research or findings. | Add the question, approach, key finding, and scope of interpretation. Keep a direct PDF link and optional embedded preview. Findings were checked against the thesis abstract and conclusions. |
| Weather demo copy | Literal `**` characters were visible. “Nothing here is simulated” conflicted with HRRR model output. A long paragraph obscured the implementation. | Correct the formatting, distinguish model guidance from observations, and shorten the explanation. |
| Soybean provenance | The work index and social description said Daymet while the displayed project and manifest use MRMS. | Correct both to MRMS and add soybean coverage to non-JavaScript and machine-readable summaries. |
| AI project positioning | The website’s broad “200+ streams” language was stronger than the résumé’s proof-of-concept description. | Use the résumé-supported proof-of-concept wording consistently. Retain the stated semifinalist recognition; omit the unconfirmed award year. |
| Mobile layout | The severe-weather map overflowed at 320 pixels. The home grid also had a rigid minimum card width. | Fix intrinsic grid/slider sizing and allow cards to fit narrow viewports. |
| Mobile navigation | Closed links were transparent but still exposed to keyboard navigation. | Hide the closed navigation properly. |
| Mobile performance | The invisible decorative globe still initialized on phones. | Mount it only at widths where it is displayed. |
| Case-study photographs | Images lacked intrinsic dimensions, allowing layout shifts during lazy loading. | Add dimensions from the actual source files so the page reserves the correct space. |
| Consistency | The work-index project links ran together; résumé actions inconsistently promised a download. | Add clear spacing and consistently label PDF actions “View Résumé.” |

## Remaining issues that copy alone cannot solve

1. **Show a complete modeling evaluation if it exists.** A senior data-science reviewer may look for a defined target, baseline, train/test design, leakage prevention, held-out performance, error analysis, and a decision enabled by the work. The current public examples mainly demonstrate data integration, exploratory analysis, numerical simulation, and application development. Do not invent a predictive-model result or imply the soybean visualization predicts yield. The PLRB gust work remains explicitly exploratory.
2. **Make the AI recognition independently inspectable.** A public AWS entry or announcement would be stronger than an unsupported award line. The recognition is supported by the supplied résumé, but this review did not independently locate a matching public award record. Confirm the year before restoring it; the competition spans 2025–2026 material.
3. **Improve the résumé’s hierarchy in its editable source.** Both PDF pages render cleanly, with no clipping or broken text. However, education and a dense skills block precede professional experience, and the second page has substantial unused space. For the next résumé revision, lead with relevant professional experience, balance the pages, and use concise project evidence. The existing linked PDF was reviewed but not rewritten or replaced.
4. **Strengthen public reproducibility for the soybean work.** The site provides a useful method summary and processed data, but this review did not find a checked-in acquisition/processing script for that project comparable to the weather explorer’s linked Python pipeline. A documented public pipeline would make the work easier to evaluate technically.
5. **Match the exact requisition.** The application’s job description was not supplied during this review. Corteva has multiple senior data scientist postings with materially different emphasis. These changes improve the existing portfolio without claiming expertise in a particular job’s unverified requirements.

## Verification

- Visited the public homepage and both interactive demonstrations; inspected the Corteva page in the browser and reviewed the local sources for all seven built pages.
- Production build passes. The existing MapLibre bundle-size advisory remains; it is not a build failure.
- All 61 unit tests pass.
- All nine browser tests pass, including all seven routes at 320, 390, and 1440 pixels, mobile navigation, soybean controls, and weather-map interactions.
- A separate final desktop/mobile audit found no broken visible images, horizontal overflow, or uncaught JavaScript errors across all seven pages. All 22 unique local links and downloads checked returned successful responses. The soybean map was checked after its loading overlay cleared. Evidence is saved under `tmp/portfolio-review/`.
- Both résumé pages were rendered and inspected. The thesis abstract (PDF page 11) and general conclusions (PDF page 95) support the new research summary.
- The initial nine-worker browser run exhausted graphics resources. The suite now runs one WebGL browser worker at a time. A separate radio-control timeout came from targeting the intentionally hidden input; the test now clicks its visible label, as a user does.

External map tiles, LinkedIn access, private employer data, the AWS award record, and production deployment are outside the passing local checks. No employer performance numbers or model metrics were invented.
