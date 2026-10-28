import os

def create_guidelines_pdf(output_path):
    pages = [
        # Page 1: Brand Identity & Tone of Voice
        [
            "ACME ENTERPRISE GLOBAL BRAND GUIDELINES",
            "Document ID: DOC-ACME-2026-V2 | Version 2.4 | Status: Active Approved",
            "Authorized by: Global Governance Council & Compliance Office",
            "",
            "Section 1: Core Voice and Messaging Standards",
            "Rule 1.1: Precision and Empirical Suboodination",
            "All outbound marketing collateral must reflect empirical accuracy and factual restraint.",
            "Unsubstantiated superlative claims such as market leader or unchallenged superior performance",
            "are strictly prohibited across digital, print, and sales pitch decks.",
            "",
            "Section 1.2: Transparency and Trust",
            "Marketing communications must clearly delineate between beta software features and general availability.",
            "Roadmap commitments shall not be phrased as guaranteed delivery dates.",
            "Customer quotes and testimonials must have documented legal consent on file before publication.",
        ],
        # Page 2: Service Level Agreements & Uptime Claims
        [
            "ACME ENTERPRISE GLOBAL BRAND GUIDELINES - PAGE 2",
            "",
            "Section 2: Cloud Infrastructure & Enterprise SLA Warranties",
            "Rule 2.1: Prohibition on Zero Downtime Promises",
            "RULE 2.1: Zero downtime guarantees and 100 percent uptime declarations are strictly prohibited.",
            "All enterprise collateral must state that uptime SLAs exclude scheduled maintenance windows",
            "and external upstream cloud provider outages.",
            "",
            "Rule 2.2: Disaster Recovery and Latency Commitments",
            "Claims of instantaneous failover or zero data loss are prohibited without explicitly qualifying",
            "the requirement for active-active multi-region database replication architecture.",
            "Sub-millisecond latency assertions must cite benchmark methodology and standard p99 bounds.",
        ],
        # Page 3: Sustainability & Environmental Claims
        [
            "ACME ENTERPRISE GLOBAL BRAND GUIDELINES - PAGE 3",
            "",
            "Section 3: Environmental Directives & Sustainable Packaging",
            "Rule 3.1: Biodegradable and Recyclable Claims Mandate",
            "RULE 3.1: Packaging may only be described as 100 percent recyclable or biodegradable if certified",
            "under ASTM D6400 or EN 13432 industrial composting standards.",
            "Vague eco-friendly or green packaging buzzwords without third-party laboratory proof are forbidden.",
            "",
            "Rule 3.2: Carbon Neutrality Claims",
            "Declarations of net-zero footprint or carbon-neutral operations must cite third-party audit",
            "verifications adhering to ISO 14064 or Greenhouse Gas Protocol Scope 1, 2, and 3 accounting.",
        ],
        # Page 4: Regulatory, FDA, and Health Disclaimers
        [
            "ACME ENTERPRISE GLOBAL BRAND GUIDELINES - PAGE 4",
            "",
            "Section 4: Healthcare and Clinical Efficacy Limitations",
            "Rule 4.1: Prohibition on Absolute Medical Efficacy",
            "RULE 4.1: Claims that any product cures, prevents, or reverses diagnosed medical conditions",
            "are strictly forbidden under FDA and FTC truth-in-advertising statutory mandates.",
            "All wellness claims must include mandatory disclaimer: These statements have not been evaluated",
            "by the Food and Drug Administration.",
            "",
            "Rule 4.2: Clinical Trial Citation Requirements",
            "Efficacy statistics must cite NCT registry numbers, peer-reviewed journal DOI links, and double-blind",
            "sample sizes of at least one hundred participants.",
        ]
    ]

    num_pages = len(pages)
    catalog_id = 1
    pages_id = 2
    font_id = 3
    
    page_obj_ids = []
    content_obj_ids = []
    
    next_id = 4
    for _ in range(num_pages):
        page_obj_ids.append(next_id)
        next_id += 1
        content_obj_ids.append(next_id)
        next_id += 1

    kids = " ".join(f"{pid} 0 R" for pid in page_obj_ids)
    all_objs = {
        catalog_id: f"<< /Type /Catalog /Pages {pages_id} 0 R >>",
        pages_id: f"<< /Type /Pages /Kids [ {kids} ] /Count {num_pages} >>",
        font_id: "<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Helvetica >>",
    }

    for i, page_lines in enumerate(pages):
        pid = page_obj_ids[i]
        cid = content_obj_ids[i]

        stream_lines = [
            "BT",
            "/F1 11 Tf",
            "40 740 Td",
            "18 TL",
        ]
        for line in page_lines:
            if line.startswith("ACME ENTERPRISE") or line.startswith("Section"):
                stream_lines.append("/F1 13 Tf")
            elif line.startswith("RULE") or line.startswith("Rule"):
                stream_lines.append("/F1 11 Tf")
            else:
                stream_lines.append("/F1 10 Tf")

            escaped = (
                line.replace("\\", "\\\\")
                .replace("(", "\\(")
                .replace(")", "\\)")
            )
            stream_lines.append(f"({escaped}) '")
        stream_lines.append("ET")
        stream_text = "\n".join(stream_lines)

        content_bytes = stream_text.encode("latin1")
        all_objs[cid] = f"<< /Length {len(content_bytes)} >>\nstream\n{stream_text}\nendstream"
        all_objs[pid] = (
            f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 612 792] "
            f"/Resources << /Font << /F1 {font_id} 0 R >> >> /Contents {cid} 0 R >>"
        )

    with open(output_path, "wb") as f:
        f.write(b"%PDF-1.4\n")
        xref_offsets = [0]

        total_objects = max(all_objs.keys())
        for oid in range(1, total_objects + 1):
            offset = f.tell()
            xref_offsets.append(offset)
            content = all_objs[oid]
            f.write(f"{oid} 0 obj\n{content}\nendobj\n".encode("latin1"))

        xref_start = f.tell()
        f.write(f"xref\n0 {total_objects + 1}\n".encode("latin1"))
        f.write(b"0000000000 65535 f \n")
        for off in xref_offsets[1:]:
            f.write(f"{off:010d} 00000 n \n".encode("latin1"))

        f.write(
            f"trailer\n<< /Size {total_objects + 1} /Root {catalog_id} 0 R >>\nstartxref\n{xref_start}\n%%EOF\n".encode("latin1")
        )

    print(f"Successfully generated guideline PDF: {output_path} ({os.path.getsize(output_path)} bytes)")

if __name__ == "__main__":
    target = os.path.join(os.getcwd(), "Brand_Compliance_Guidelines_2026.pdf")
    create_guidelines_pdf(target)
