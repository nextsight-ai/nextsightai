"""Database models for security scanning."""

from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, JSON, Index
from app.models.base import Base


class ImageScanResult(Base):
    """Persistent storage for container image vulnerability scans."""

    __tablename__ = "image_scan_results"

    id = Column(String, primary_key=True)
    image_name = Column(String, nullable=False, index=True)
    image_hash = Column(String, nullable=True)  # SHA256 of the image for cache invalidation
    
    # Vulnerability counts
    critical_count = Column(Integer, default=0)
    high_count = Column(Integer, default=0)
    medium_count = Column(Integer, default=0)
    low_count = Column(Integer, default=0)
    unknown_count = Column(Integer, default=0)
    total_count = Column(Integer, default=0)
    
    # Detailed vulnerabilities as JSON
    vulnerabilities = Column(JSON, nullable=False, default=list)
    
    # Scan metadata
    scan_time = Column(DateTime, nullable=False, default=datetime.utcnow)
    scanner_version = Column(String, nullable=True)  # Trivy version
    cluster_id = Column(String, default="default", index=True)
    
    # Indexes for faster queries
    __table_args__ = (
        Index('idx_image_cluster', 'image_name', 'cluster_id'),
        Index('idx_scan_time', 'scan_time'),
    )

    def __repr__(self):
        return f"<ImageScanResult(image={self.image_name}, total_vulns={self.total_count})>"
