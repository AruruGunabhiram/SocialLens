package com.LogicGraph.sociallens.entity;

import com.LogicGraph.sociallens.enums.Platform;
import jakarta.persistence.*;

@Entity
@Table(name = "connected_accounts")
public class ConnectedAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private Platform platform;

    private String externalAccountId;

    @ManyToOne
    private User user;

    public ConnectedAccount() {}

    public ConnectedAccount(Platform platform, String externalAccountId, User user) {
        this.platform = platform;
        this.externalAccountId = externalAccountId;
        this.user = user;
    }

    public Long getId() {
        return id;
    }

    public Platform getPlatform() {
        return platform;
    }

    public String getExternalAccountId() {
        return externalAccountId;
    }

    public User getUser() {
        return user;
    }
}
