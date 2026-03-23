package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    /** Returns the user with the lowest id, or empty if the table is empty. */
    java.util.Optional<User> findFirstByOrderByIdAsc();

    java.util.Optional<User> findByEmail(String email);
}
