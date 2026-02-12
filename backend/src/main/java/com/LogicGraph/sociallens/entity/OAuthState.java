package com.LogicGraph.sociallens.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "oauth_states")
@Getter
@Setter
public class OAuthState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String state;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private boolean used;

    @Column(nullable = false)
    private Instant expiresAt;
}
