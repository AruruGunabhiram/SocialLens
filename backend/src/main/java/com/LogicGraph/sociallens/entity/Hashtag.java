package com.LogicGraph.sociallens.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "hashtag")
public class Hashtag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String tag;

    public Long getId() { return id; }
    public String getTag() { return tag; }
    public void setTag(String tag) { this.tag = tag; }
}
