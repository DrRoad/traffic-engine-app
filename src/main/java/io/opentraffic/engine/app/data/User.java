package io.opentraffic.engine.app.data;

import javax.persistence.*;
import java.util.List;

/**
 * Created by dbenoff on 1/19/16.
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy= GenerationType.AUTO)
    @Column(name = "id")
    private int id;
    @Column(unique = true)
    private String username;
    @Column(length = 1000)
    private String passwordHash;
    private String role;
    private String cookie;
    @OneToMany(fetch = FetchType.LAZY, mappedBy = "user")
    private List<SavedRoute> savedRoutes;

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getCookie() {
        return cookie;
    }

    public void setCookie(String cookie) {
        this.cookie = cookie;
    }

    public List<SavedRoute> getSavedRoutes() {
        return savedRoutes;
    }

    public void setSavedRoutes(List<SavedRoute> savedRoutes) {
        this.savedRoutes = savedRoutes;
    }
}
