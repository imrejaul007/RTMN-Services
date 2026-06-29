-- Ontology Engine Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE constraint_type AS ENUM ('required', 'type', 'cardinality', 'range', 'pattern', 'custom');
CREATE TYPE cardinality_type AS ENUM ('one', 'many', 'zero_or_one', 'zero_or_many');
CREATE TYPE property_type AS ENUM ('string', 'number', 'boolean', 'date', 'datetime', 'array', 'object', 'uri', 'enum');
CREATE TYPE relationship_direction AS ENUM ('outbound', 'inbound', 'undirected');

-- Classes table (ontological concepts)
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    parent_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    is_abstract BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_classes_parent ON classes(parent_class_id);
CREATE INDEX idx_classes_name ON classes(name);

-- Properties table (attributes of classes)
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    data_type property_type NOT NULL,
    description TEXT,
    default_value JSONB,
    is_inherited BOOLEAN DEFAULT FALSE,
    source_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, class_id)
);

CREATE INDEX idx_properties_class ON properties(class_id);
CREATE INDEX idx_properties_source ON properties(source_class_id);

-- Relationship types table (links between classes)
CREATE TABLE relationship_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    source_class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    target_class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    description TEXT,
    direction relationship_direction DEFAULT 'undirected',
    is_transitive BOOLEAN DEFAULT FALSE,
    is_symmetric BOOLEAN DEFAULT FALSE,
    inverse_relationship_id UUID REFERENCES relationship_types(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rel_source ON relationship_types(source_class_id);
CREATE INDEX idx_rel_target ON relationship_types(target_class_id);

-- Constraints table
CREATE TABLE constraints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    relationship_type_id UUID REFERENCES relationship_types(id) ON DELETE CASCADE,
    constraint_type constraint_type NOT NULL,
    value JSONB NOT NULL,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (
        (property_id IS NOT NULL AND relationship_type_id IS NULL) OR
        (property_id IS NULL AND relationship_type_id IS NOT NULL)
    )
);

CREATE INDEX idx_constraints_property ON constraints(property_id);
CREATE INDEX idx_constraints_rel_type ON constraints(relationship_type_id);

-- Inference rules table
CREATE TABLE inference_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL,
    antecedent JSONB NOT NULL,
    consequent JSONB NOT NULL,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rules_type ON inference_rules(rule_type);
CREATE INDEX idx_rules_active ON inference_rules(is_active);

-- Taxonomy hierarchy table (for taxonomy management)
CREATE TABLE taxonomy_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES taxonomy_nodes(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    depth INTEGER DEFAULT 0,
    path LTREE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(slug, parent_id)
);

CREATE INDEX idx_taxonomy_parent ON taxonomy_nodes(parent_id);
CREATE INDEX idx_taxonomy_path ON taxonomy_nodes USING GIST(path);

-- Instances table (entities that conform to classes)
CREATE TABLE instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_instances_class ON instances(class_id);
CREATE INDEX idx_instances_data ON instances USING GIN(data);

-- Instance relationships
CREATE TABLE instance_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    relationship_type_id UUID NOT NULL REFERENCES relationship_types(id) ON DELETE CASCADE,
    source_instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
    target_instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(relationship_type_id, source_instance_id, target_instance_id)
);

CREATE INDEX idx_inst_rel_type ON instance_relationships(relationship_type_id);
CREATE INDEX idx_inst_rel_source ON instance_relationships(source_instance_id);
CREATE INDEX idx_inst_rel_target ON instance_relationships(target_instance_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rel_types_updated_at BEFORE UPDATE ON relationship_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_constraints_updated_at BEFORE UPDATE ON constraints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inference_rules_updated_at BEFORE UPDATE ON inference_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_taxonomy_nodes_updated_at BEFORE UPDATE ON taxonomy_nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instances_updated_at BEFORE UPDATE ON instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
